/**
 * DisposableMediaEnv — a per-run, throwaway PostgreSQL database + isolated temp
 * storage for Controlled Reclamation Verification (WI-B, #375).
 *
 * The real, unmodified reclaimer runs against substrates that contain ONLY this
 * run's fixtures: a fresh `wib_verify_*` database (created from the dev
 * connection; schema built by applying the committed migration SQL files in
 * order) bound to a dedicated PrismaClient + transaction runner, and a temp-dir
 * local-disk store. Teardown drops the database and removes the temp dir.
 *
 * Safety for the destructive rehearsal is structural: the reclaimer's connection
 * names only the disposable database, and `guard()` asserts the bound
 * `current_database()` matches the `wib_verify_` prefix and differs from the dev
 * database, and that the storage root is this run's temp dir — so a destructive
 * pass cannot reach dev data. (A disposable database in the same cluster shares
 * the cluster `system_identifier`, so identity relies on the database
 * name/OID + bound connection + fixture counts + isolated storage root, never on
 * a differing `system_identifier`.)
 *
 * Verification-only; never imported by production code.
 */

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../../../generated/prisma/client.js";
import type { DbClient, RunInTransaction } from "../../../shared/database/index.js";
import { createLocalDiskStorageAdapter } from "../storage/local-disk.adapter.js";
import type { StorageAdapter } from "../media.types.js";

/** server/prisma/migrations — four levels up from this file's directory. */
const MIGRATIONS_DIR = fileURLToPath(new URL("../../../../prisma/migrations", import.meta.url));

export interface DisposableMediaEnv {
  readonly dbName: string;
  readonly devDbName: string;
  readonly prisma: PrismaClient;
  readonly runInTransaction: RunInTransaction;
  readonly storage: StorageAdapter;
  readonly storageRoot: string;
  /** Assert the bound connection is the disposable DB and storage is the temp dir. Throws otherwise. */
  guard(): Promise<void>;
  teardown(): Promise<void>;
}

/** Apply every committed migration's SQL to `client`, in lexical (timestamp) order. */
const applyMigrations = async (client: pg.Client): Promise<void> => {
  const dirs = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const dir of dirs) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
    await client.query(sql);
  }
};

export const createDisposableMediaEnv = async (): Promise<DisposableMediaEnv> => {
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error("DATABASE_URL is required for the verification harness");
  const devDbName = decodeURIComponent(new URL(devUrl).pathname.replace(/^\//, ""));

  // Unique per run — hrtime (not Date.now) plus pid separates parallel test files.
  const dbName = `wib_verify_${process.pid}_${process.hrtime.bigint()}`;
  const dispUrl = new URL(devUrl);
  dispUrl.pathname = `/${dbName}`;
  const dispConn = dispUrl.toString();

  // 1) Create the disposable database from the dev connection. CREATE DATABASE
  //    cannot run inside a transaction; a lone pg statement autocommits.
  const admin = new pg.Client({ connectionString: devUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  // 2) Build the schema by applying the committed migration SQL files in order.
  const migrator = new pg.Client({ connectionString: dispConn });
  await migrator.connect();
  try {
    await applyMigrations(migrator);
  } finally {
    await migrator.end();
  }

  // 3) Bind a dedicated Prisma client + transaction runner to the disposable DB.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dispConn }) });
  const runInTransaction: RunInTransaction = (fn) =>
    prisma.$transaction((tx) => fn(tx as unknown as DbClient));

  // 4) Isolated storage: a real local-disk adapter rooted at a per-run temp dir.
  const storageRoot = await mkdtemp(path.join(os.tmpdir(), "wib-verify-"));
  const storage = createLocalDiskStorageAdapter({ baseDir: storageRoot });

  const guard = async (): Promise<void> => {
    const rows = await prisma.$queryRawUnsafe<{ db: string }[]>("SELECT current_database() AS db");
    const db = rows[0]?.db ?? "";
    if (!/^wib_verify_/.test(db)) {
      throw new Error(`SAFETY GUARD: bound database "${db}" is not a wib_verify_* disposable database`);
    }
    if (db === devDbName) {
      throw new Error(`SAFETY GUARD: bound database equals the dev database "${devDbName}"`);
    }
    const devUpload = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
    if (path.resolve(storageRoot) === devUpload) {
      throw new Error("SAFETY GUARD: storage root equals the dev UPLOAD_DIR");
    }
  };

  const teardown = async (): Promise<void> => {
    await prisma.$disconnect();
    const dropper = new pg.Client({ connectionString: devUrl });
    await dropper.connect();
    try {
      await dropper.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    } finally {
      await dropper.end();
    }
    await rm(storageRoot, { recursive: true, force: true });
  };

  return { dbName, devDbName, prisma, runInTransaction, storage, storageRoot, guard, teardown };
};
