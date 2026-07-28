/**
 * Reclamation recovery — tombstoned-lingering-bytes sweep against a REAL Postgres (#356).
 *
 * Run with `npm run test:integration`. Proves the crash-after-tombstone recovery
 * end-to-end: a `deleted` row whose bytes still linger is discovered and its bytes
 * re-deleted (destructive) or only surfaced (report), while the tombstone row is
 * **permanently retained** — retryable cleanup, never a re-tombstone or a row delete.
 *
 * Safety on a shared dev database: a full pass would otherwise scan for reclaim
 * candidates and tombstone foreign objects, so these tests inject a
 * `findUnreferencedOwned → []` repo. Every remaining query (recovery discovery,
 * orphan diff, audit) is store-scoped to this run's controlled in-memory store, so
 * the pass touches nothing but the seeded, TAG-tagged rows.
 *
 * The in-memory store + fault wrapper are the minimal seam this Work Item needs;
 * WI-B (#375) generalizes them into the disposable-environment harness.
 *
 * Excluded from the default unit run (CI has no database).
 */

import { Readable } from "node:stream";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { runReclamation } from "./media.reclamation.js";
import {
  createReclamationRepository,
  type IReclamationRepository,
  type ReclaimCandidate,
} from "./media.reclamation.repository.js";
import { mintToken } from "./media.tokens.js";
import type { StorageAdapter, StorageKey } from "./media.types.js";

const TAG = `it-recover-${process.pid}-${Math.floor(process.hrtime()[1])}`;

/**
 * A minimal in-memory byte store — the controlled oracle for a recovery pass.
 * (WI-B generalizes this, with the fault wrapper below, into the disposable-env harness.)
 */
class InMemoryStorage implements StorageAdapter {
  private readonly bytes = new Map<string, number>();
  put(key: string, size = 10): void { this.bytes.set(key, size); }
  has(key: string): boolean { return this.bytes.has(key); }
  async save(key: StorageKey): Promise<void> { this.bytes.set(key, 10); }
  async createReadStream(): Promise<Readable> { return Readable.from([]); }
  async exists(key: StorageKey): Promise<boolean> { return this.bytes.has(key); }
  async delete(key: StorageKey): Promise<void> { this.bytes.delete(key); }
  async enumerate(): Promise<StorageKey[]> { return [...this.bytes.keys()] as StorageKey[]; }
}

/**
 * Wraps a StorageAdapter so `delete()` throws for chosen keys — reproducing the
 * crash-after-tombstone window (a committed tombstone whose byte delete then
 * fails). The minimal fault-injection seam; WI-B extends it (throw-once / N-times)
 * for the full failure-injection matrix.
 */
class FaultInjectingStorage implements StorageAdapter {
  constructor(
    private readonly inner: StorageAdapter,
    private readonly failDeletes: ReadonlySet<string>,
  ) {}
  async save(key: StorageKey, data: Readable): Promise<void> { return this.inner.save(key, data); }
  async createReadStream(key: StorageKey): Promise<Readable> { return this.inner.createReadStream(key); }
  async exists(key: StorageKey): Promise<boolean> { return this.inner.exists(key); }
  async delete(key: StorageKey): Promise<void> {
    if (this.failDeletes.has(key)) throw new Error(`injected delete failure: ${key}`);
    return this.inner.delete(key);
  }
  async enumerate(): Promise<StorageKey[]> { return this.inner.enumerate(); }
}

/**
 * The real repository with its candidate scan disabled — so a report/destructive
 * pass here can NEVER tombstone a foreign dev-database object. Recovery discovery,
 * the orphan diff, and audit persistence all run for real, scoped to the store.
 */
const recoveryOnlyRepo = (): IReclamationRepository => ({
  ...createReclamationRepository(),
  findUnreferencedOwned: async () => [],
});

let reachable = false;
let userId = 0;
let seq = 0;

const seedTombstoned = async (status = "deleted"): Promise<{ id: number; key: string }> => {
  seq += 1;
  const key = `objects/${TAG}-${seq}`;
  const obj = await prisma.mediaObject.create({
    data: {
      token: mintToken(),
      storageKey: key,
      contentType: "image/png",
      size: 10,
      status,
      uploaderId: userId,
    },
  });
  return { id: obj.id, key };
};

const statusOf = async (id: number): Promise<string | undefined> =>
  (await prisma.mediaObject.findUnique({ where: { id } }))?.status;

const auditFor = async (key: string): Promise<string[]> =>
  (await prisma.mediaReclamationAudit.findMany({ where: { storageKey: key } })).map(
    (a) => `${a.reason}:${a.outcome}`,
  );

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: `${TAG}-u`, name: "Recover IT", email: `${TAG}@recover.local`, passwordHash: "x" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (reachable) {
    await prisma.mediaReclamationAudit.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.mediaQuarantine.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@recover.local` } });
  }
  await prisma.$disconnect();
});

describe("reclamation recovery — findLingeringTombstones boundaries (real Postgres)", () => {
  it("admits a tombstoned row whose key is in the store; excludes ready rows and out-of-store keys", async () => {
    if (!reachable) return;
    const repo = createReclamationRepository();
    const tomb = await seedTombstoned("deleted");
    const ready = await seedTombstoned("ready");

    const found = new Set(
      (await repo.findLingeringTombstones([tomb.key, ready.key, `objects/${TAG}-absent`])).map((t) => t.id),
    );

    expect(found.has(tomb.id)).toBe(true); // tombstoned AND its key is in the store set
    expect(found.has(ready.id)).toBe(false); // key in the set but status='ready'
    // A tombstone whose key is not among the store keys is never offered (store-scoped).
    expect(await repo.findLingeringTombstones([])).toHaveLength(0);
  });
});

describe("reclamation recovery — report vs destructive pass (real Postgres + controlled store)", () => {
  it("report pass surfaces the lingering tombstone (would_recover) and leaves its bytes", async () => {
    if (!reachable) return;
    const { id, key } = await seedTombstoned("deleted");
    const store = new InMemoryStorage();
    store.put(key);

    const report = await runReclamation({
      storage: store, repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "report", log: () => {},
    });

    expect(report.recoverable).toBe(1);
    expect(report.recovered).toBe(0);
    expect(store.has(key)).toBe(true); // report deleted nothing
    expect(await statusOf(id)).toBe("deleted"); // tombstone retained
    expect(await auditFor(key)).toContain("lingering_bytes:would_recover");
  });

  it("destructive pass re-deletes the lingering bytes and retains the tombstone", async () => {
    if (!reachable) return;
    const { id, key } = await seedTombstoned("deleted");
    const store = new InMemoryStorage();
    store.put(key);

    const report = await runReclamation({
      storage: store, repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "destructive", log: () => {},
    });

    expect(report.recovered).toBe(1);
    expect(store.has(key)).toBe(false); // bytes recovered
    expect(await statusOf(id)).toBe("deleted"); // row permanently retained
    expect(await auditFor(key)).toContain("lingering_bytes:recovered");
  });

  it("crash after tombstone commit: a failed delete stays backlog; the next pass recovers it (idempotent)", async () => {
    if (!reachable) return;
    const { id, key } = await seedTombstoned("deleted");
    const store = new InMemoryStorage();
    store.put(key);

    // Pass 1 — the byte delete is injected to fail (the crash-after-tombstone window).
    const pass1 = await runReclamation({
      storage: new FaultInjectingStorage(store, new Set([key])),
      repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "destructive", log: () => {},
    });
    expect(pass1.recoverable).toBe(1);
    expect(pass1.recovered).toBe(0); // delete failed → still backlog
    expect(store.has(key)).toBe(true); // bytes still lingering
    expect(await statusOf(id)).toBe("deleted"); // tombstone intact

    // Pass 2 — no injected fault; the sweep drains the backlog.
    const pass2 = await runReclamation({
      storage: store, repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "destructive", log: () => {},
    });
    expect(pass2.recovered).toBe(1);
    expect(store.has(key)).toBe(false); // recovered on retry
    expect(await statusOf(id)).toBe("deleted"); // still retained
  });

  it("a tombstone whose bytes are already gone is a no-op (idempotent, never re-swept)", async () => {
    if (!reachable) return;
    const { id } = await seedTombstoned("deleted"); // no bytes placed in the store
    const store = new InMemoryStorage(); // empty store → drained tombstone absent from enumeration

    const report = await runReclamation({
      storage: store, repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "destructive", log: () => {},
    });

    expect(report.recoverable).toBe(0);
    expect(report.recovered).toBe(0);
    expect(await statusOf(id)).toBe("deleted");
  });

  // The authoritative contract, end-to-end across a mode transition: report mode
  // performs ZERO physical byte deletion, INCLUDING the recovery of a previously
  // committed tombstone. The lingering bytes are the last recoverable artifact of a
  // prior destructive run, so switching to report halts all physical deletion — the
  // backlog is only surfaced, and drained solely by a later destructive pass.
  it("destructive tombstone whose delete failed is left untouched by a report pass, drained only by a later destructive pass", async () => {
    if (!reachable) return;
    seq += 1;
    const key = `objects/${TAG}-${seq}`;
    const obj = await prisma.mediaObject.create({
      data: {
        token: mintToken(),
        storageKey: key,
        contentType: "image/png",
        size: 10,
        status: "ready",
        uploaderId: userId,
      },
    });
    const store = new InMemoryStorage();
    store.put(key);

    // The candidate the destructive pass will tombstone — supplied explicitly so the
    // pass never scans or tombstones a foreign dev-database row. tombstoneIfReclaimable
    // runs for real, so the tombstone is a genuine, durably committed reclamation.
    const candidate: ReclaimCandidate = {
      id: obj.id, storageKey: key as StorageKey, size: 10, reason: "unreferenced",
    };
    const withCandidate: IReclamationRepository = {
      ...createReclamationRepository(),
      findUnreferencedOwned: async () => [candidate],
    };

    // 1) Destructive pass — the tombstone commits, but the byte delete is injected to fail.
    const pass1 = await runReclamation({
      storage: new FaultInjectingStorage(store, new Set([key])),
      repo: withCandidate, graceMs: 0, batch: 100, mode: "destructive", log: () => {},
    });
    expect(pass1.reclaimed).toBe(0); // the delete failed → not counted reclaimed
    expect(await statusOf(obj.id)).toBe("deleted"); // tombstone durably committed
    expect(store.has(key)).toBe(true); // bytes linger (the delete threw)

    // 2) Report pass over the lingering tombstone — MUST perform zero physical deletion.
    const pass2 = await runReclamation({
      storage: store, repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "report", log: () => {},
    });
    expect(pass2.recoverable).toBe(1); // surfaced
    expect(pass2.recovered).toBe(0); // report never completes a committed deletion
    expect(store.has(key)).toBe(true); // bytes retained under report — the kill-switch guarantee
    expect(await statusOf(obj.id)).toBe("deleted"); // tombstone retained
    expect(await auditFor(key)).toContain("lingering_bytes:would_recover");

    // 3) A later destructive pass drains the backlog.
    const pass3 = await runReclamation({
      storage: store, repo: recoveryOnlyRepo(), graceMs: 0, batch: 100, mode: "destructive", log: () => {},
    });
    expect(pass3.recovered).toBe(1);
    expect(store.has(key)).toBe(false); // bytes finally removed
    expect(await statusOf(obj.id)).toBe("deleted"); // tombstone still retained
    expect(await auditFor(key)).toContain("lingering_bytes:recovered");
  });
});
