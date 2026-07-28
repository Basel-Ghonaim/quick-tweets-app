/**
 * The verification Oracle (WI-B, #375) — an INDEPENDENT source of truth.
 *
 * Expectations are hand-authored literals in the test suites (from each
 * fixture's declared intent + ADR 0005 D8), never computed by calling M11's
 * selection predicate. This module only provides *observation* and *invariant*
 * primitives that read the registry and the byte store SEPARATELY, so a bug that
 * updates one but not the other, hard-deletes a row, deletes on divergence, or
 * reads a feature table is caught rather than ratified.
 *
 * Verification-only; never imported by production code.
 */

import { expect } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client.js";
import type { DisposableMediaEnv } from "./disposable-env.js";
import { storageKey } from "../media.keys.js";

/** One object's observable state, read independently from DB and storage. */
export interface ObservedState {
  /** `media_objects.status`, or `null` when there is no row (hard-deleted / never existed). */
  status: "ready" | "deleted" | null;
  /** Whether any `media_references` row points at the object. */
  referenced: boolean;
  /** Whether the bytes exist in the store (independent read). */
  bytesPresent: boolean;
}

/** Read an object's state from the registry and the byte store, independently. */
export const observe = async (
  env: DisposableMediaEnv,
  id: number | null,
  key: string,
): Promise<ObservedState> => {
  let status: ObservedState["status"] = null;
  let referenced = false;
  if (id !== null) {
    const row = await env.prisma.mediaObject.findUnique({ where: { id }, select: { status: true } });
    status = (row?.status as ObservedState["status"]) ?? null;
    referenced = (await env.prisma.mediaReference.count({ where: { mediaId: id } })) > 0;
  }
  const bytesPresent = await env.storage.exists(storageKey(key));
  return { status, referenced, bytesPresent };
};

/** The set of storage keys currently present (independent storage enumeration). */
export const storageKeySet = async (env: DisposableMediaEnv): Promise<Set<string>> =>
  new Set(await env.storage.enumerate());

/** `reason:outcome` strings for the audit rows recorded against a key. */
export const auditFor = async (env: DisposableMediaEnv, key: string): Promise<string[]> =>
  (await env.prisma.mediaReclamationAudit.findMany({ where: { storageKey: key } }))
    .map((a) => `${a.reason}:${a.outcome}`)
    .sort();

/** Kinds of the OPEN quarantine rows recorded against a key. */
export const openQuarantineKinds = async (env: DisposableMediaEnv, key: string): Promise<string[]> =>
  (await env.prisma.mediaQuarantine.findMany({ where: { storageKey: key, resolvedAt: null } }))
    .map((q) => q.kind)
    .sort();

/** Total registry rows — used to prove reclamation never hard-deletes a row. */
export const objectRowCount = async (env: DisposableMediaEnv): Promise<number> => {
  const r = await env.prisma.$queryRawUnsafe<{ n: number }[]>(
    "SELECT count(*)::int AS n FROM media_objects",
  );
  return r[0]!.n;
};

/** GLOBAL INVARIANT: a tombstoned object must never still hold a live reference. */
export const assertNoDeletedReferenced = async (env: DisposableMediaEnv): Promise<void> => {
  const r = await env.prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n
       FROM media_objects o
       JOIN media_references r ON r.media_id = o.id
      WHERE o.status = 'deleted'`,
  );
  expect(r[0]!.n, "forbidden state: a tombstoned object still holds a live reference").toBe(0);
};

/** GLOBAL INVARIANT: a report pass must change no bytes and no row status. */
export const assertReportChangedNothing = (
  before: { keys: Set<string>; statuses: Map<number, string | null> },
  after: { keys: Set<string>; statuses: Map<number, string | null> },
): void => {
  expect([...after.keys].sort(), "report deleted or added bytes").toEqual([...before.keys].sort());
  for (const [id, status] of before.statuses) {
    expect(after.statuses.get(id), `report changed status of object ${id}`).toBe(status);
  }
};

/** Snapshot the status of a set of objects (for the report-changed-nothing invariant). */
export const snapshotStatuses = async (
  env: DisposableMediaEnv,
  ids: number[],
): Promise<Map<number, string | null>> => {
  const m = new Map<number, string | null>();
  for (const id of ids) {
    const row = await env.prisma.mediaObject.findUnique({ where: { id }, select: { status: true } });
    m.set(id, row?.status ?? null);
  }
  return m;
};

// ─── Runtime registry-only query-tap ─────────────────────────────────────────

/** Every Prisma model delegate name in the schema. */
const ALL_MODELS = [
  "user", "refreshToken", "tweet", "tweetMedia", "comment", "like", "follow",
  "mediaObject", "mediaReference", "mediaReclamationAudit", "mediaQuarantine",
] as const;

/** The only models the runtime reclaimer may touch (ADR 0005 D8 — registry-only). */
export const REGISTRY_MODELS: ReadonlySet<string> = new Set([
  "mediaObject", "mediaReference", "mediaReclamationAudit", "mediaQuarantine",
]);

/**
 * Wrap a Prisma client so every access of a model delegate is recorded. Running
 * the reclaimer on the returned client and asserting `touched ⊆ REGISTRY_MODELS`
 * is an INDEPENDENT runtime proof (beyond the source-import guard) that selection
 * reads no feature schema.
 */
export const tapModels = (client: PrismaClient): { client: PrismaClient; touched: Set<string> } => {
  const touched = new Set<string>();
  const proxy = new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && (ALL_MODELS as readonly string[]).includes(prop)) {
        touched.add(prop);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return { client: proxy as PrismaClient, touched };
};

/** GLOBAL INVARIANT: the runtime selection touched only registry models. */
export const assertRegistryOnly = (touched: Set<string>): void => {
  const feature = [...touched].filter((m) => !REGISTRY_MODELS.has(m));
  expect(feature, `runtime selection touched feature model(s): ${feature.join(", ")}`).toEqual([]);
};
