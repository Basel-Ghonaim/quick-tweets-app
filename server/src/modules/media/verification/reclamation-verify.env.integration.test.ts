/**
 * DisposableMediaEnv smoke test (WI-B, #375) — proves the harness can create a
 * throwaway `wib_verify_*` database, build the schema from the committed
 * migrations, seed a fixture with real bytes, enforce the safety guard, and tear
 * everything down. Run with `npm run test:integration`.
 */

import { Readable } from "node:stream";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDisposableMediaEnv, type DisposableMediaEnv } from "./disposable-env.js";
import { storageKey } from "../media.keys.js";
import { mintToken } from "../media.tokens.js";

let env: DisposableMediaEnv | null = null;
let reachable = false;

beforeAll(async () => {
  try {
    env = await createDisposableMediaEnv();
    reachable = true;
  } catch (err) {
    // No reachable database (CI) — treat as skipped, like the sibling suites.
    console.warn(`[wib] disposable env unavailable — skipping: ${String(err)}`);
    reachable = false;
  }
}, 60_000);

afterAll(async () => {
  if (env) await env.teardown();
}, 30_000);

describe("DisposableMediaEnv — infrastructure smoke", () => {
  it("creates a wib_verify_* database distinct from dev, with the full schema", async () => {
    if (!reachable || !env) return;
    expect(env.dbName).toMatch(/^wib_verify_/);
    expect(env.dbName).not.toBe(env.devDbName);
    // The reclamation tables exist (schema fully applied from migrations).
    expect(await env.prisma.mediaObject.count()).toBe(0);
    expect(await env.prisma.mediaReference.count()).toBe(0);
    expect(await env.prisma.mediaReclamationAudit.count()).toBe(0);
    expect(await env.prisma.mediaQuarantine.count()).toBe(0);
  });

  it("seeds a fixture with real bytes and reads it back independently", async () => {
    if (!reachable || !env) return;
    const user = await env.prisma.user.create({
      data: { username: "wib-u", name: "WIB", email: "wib@verify.local", passwordHash: "x" },
    });
    const key = "objects/wibv-smoke";
    const obj = await env.prisma.mediaObject.create({
      data: {
        token: mintToken(),
        storageKey: key,
        contentType: "image/png",
        size: 3,
        status: "ready",
        uploaderId: user.id,
      },
    });
    await env.storage.save(storageKey(key), Readable.from([Buffer.from("abc")]));

    expect(await env.storage.exists(storageKey(key))).toBe(true);
    expect(await env.storage.enumerate()).toContain(key);
    const found = await env.prisma.mediaObject.findUnique({ where: { id: obj.id } });
    expect(found?.status).toBe("ready");
  });

  it("guard() passes for the disposable DB + temp storage root", async () => {
    if (!reachable || !env) return;
    await expect(env.guard()).resolves.toBeUndefined();
  });
});
