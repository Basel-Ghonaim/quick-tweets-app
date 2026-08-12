/**
 * Negative controls (WI-B, #375) — the anti-circularity proof.
 *
 * Each test injects an INCORRECT post-state (or a feature-table access) and
 * asserts the corresponding Oracle mechanism REPORTS FAILURE. If any of these did
 * not fail, the Oracle would be too weak to catch a real M11 bug and the
 * Engineering GO is void. No alternate M11 implementation is built: the wrong
 * states are manufactured directly, so the controls prove the Oracle's assertions
 * are sharp without duplicating the reclaimer.
 */

import { Readable } from "node:stream";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDisposableMediaEnv, type DisposableMediaEnv } from "./disposable-env.js";
import {
  assertNoDeletedReferenced,
  assertRegistryOnly,
  assertReportChangedNothing,
  observe,
  tapModels,
  type ObservedState,
} from "./oracle.js";
import { storageKey } from "../../media.keys.js";
import { mintToken } from "../../media.tokens.js";

let env: DisposableMediaEnv | null = null;
let reachable = false;
let userId = 0;
let seq = 0;

const seedObject = async (
  e: DisposableMediaEnv,
  opts: { status?: string; withBytes?: boolean } = {},
): Promise<{ id: number; key: string }> => {
  seq += 1;
  const key = `objects/wibnc-${seq}`;
  const obj = await e.prisma.mediaObject.create({
    data: {
      token: mintToken(),
      storageKey: key,
      contentType: "image/png",
      size: 3,
      status: opts.status ?? "ready",
      uploaderId: userId,
    },
  });
  if (opts.withBytes ?? true) await e.storage.save(storageKey(key), Readable.from([Buffer.from("abc")]));
  return { id: obj.id, key };
};

beforeAll(async () => {
  try {
    env = await createDisposableMediaEnv();
    const user = await env.prisma.user.create({
      data: { username: "wib-nc", name: "NC", email: "nc@verify.local", passwordHash: "x" },
    });
    userId = user.id;
    reachable = true;
  } catch (err) {
    console.warn(`[wib] disposable env unavailable — skipping: ${String(err)}`);
    reachable = false;
  }
}, 60_000);

afterAll(async () => {
  if (env) await env.teardown();
}, 30_000);

describe("negative controls — the Oracle detects incorrect outcomes", () => {
  it("NC1: the forbidden-state invariant fires on a deleted+referenced row", async () => {
    if (!reachable || !env) return;
    const { id } = await seedObject(env, { status: "deleted" });
    await env.prisma.mediaReference.create({ data: { mediaId: id, referrer: "wibnc-ref" } });

    await expect(assertNoDeletedReferenced(env)).rejects.toThrow();

    await env.prisma.mediaReference.deleteMany({ where: { mediaId: id } }); // restore the invariant
    await expect(assertNoDeletedReferenced(env)).resolves.toBeUndefined();
  });

  it("NC2: the report-changed-nothing invariant fires on a byte change and a status change", () => {
    const before = { keys: new Set(["objects/a"]), statuses: new Map([[1, "ready"]]) };
    expect(() =>
      assertReportChangedNothing(before, { keys: new Set<string>(), statuses: before.statuses }),
    ).toThrow(); // a byte disappeared
    expect(() =>
      assertReportChangedNothing(before, { keys: before.keys, statuses: new Map([[1, "deleted"]]) }),
    ).toThrow(); // a status changed
    // The same snapshot compared to itself must pass.
    expect(() => assertReportChangedNothing(before, before)).not.toThrow();
  });

  it("NC3: a hard-deleted row fails the 'reclaimed' literal (tombstone must be retained)", async () => {
    if (!reachable || !env) return;
    const { id, key } = await seedObject(env);
    // A correct reclaim tombstones + deletes bytes; simulate a WRONG hard delete.
    await env.storage.delete(storageKey(key));
    await env.prisma.mediaObject.delete({ where: { id } });

    const reclaimed: ObservedState = { status: "deleted", referenced: false, bytesPresent: false };
    const actual = await observe(env, id, key);
    expect(actual.status).toBeNull(); // row gone — NOT a retained tombstone
    expect(() => expect(actual).toEqual(reclaimed)).toThrow();
  });

  it("NC4: deleted divergence bytes fail the 'quarantined' literal (divergences are never byte-deleted)", async () => {
    if (!reachable || !env) return;
    const { id, key } = await seedObject(env); // stands in for an orphan/row_without_bytes fixture
    // Correct behaviour keeps the bytes; simulate a WRONG byte deletion on divergence.
    await env.storage.delete(storageKey(key));

    const quarantinedKept: ObservedState = { status: "ready", referenced: false, bytesPresent: true };
    const actual = await observe(env, id, key);
    expect(actual.bytesPresent).toBe(false);
    expect(() => expect(actual).toEqual(quarantinedKept)).toThrow();
  });

  it("NC5: the registry-only tap records a feature-model access and the invariant fires", async () => {
    if (!reachable || !env) return;
    const { client: tapped, touched } = tapModels(env.prisma);
    await tapped.mediaObject.count(); // a legitimate registry access — allowed
    await tapped.tweet.count(); // a FORBIDDEN feature-schema access

    expect(touched.has("mediaObject")).toBe(true);
    expect(touched.has("tweet")).toBe(true);
    expect(() => assertRegistryOnly(touched)).toThrow(); // the invariant catches the feature read
    // A registry-only touch set passes.
    expect(() => assertRegistryOnly(new Set(["mediaObject", "mediaReference"]))).not.toThrow();
  });
});
