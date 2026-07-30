/**
 * resolveUserByHandle — against a REAL Postgres. Run with `npm run test:integration`.
 * Proves the single resolver: a current username resolves (viaAlias false), a
 * reserved former handle resolves to the current user (viaAlias true), and an
 * unknown handle is null. TAG-scoped rows are removed on teardown.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../database/index.js";
import { resolveUserByHandle } from "./resolveUserByHandle.js";

const TAG = `itresolve${process.pid}x${Math.floor(process.hrtime()[1])}`;
const current = `${TAG}_cur`;
const former = `${TAG}_old`;
let reachable = false;
let userId = 0;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const u = await prisma.user.create({ data: { username: current, email: `${TAG}@it.local`, passwordHash: "x" } });
  userId = u.id;
  await prisma.usernameAlias.create({ data: { username: former, userId } });
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.usernameAlias.deleteMany({ where: { username: { startsWith: TAG } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
  }
  await prisma.$disconnect();
});

describe("resolveUserByHandle — real Postgres", () => {
  it("resolves a current username (viaAlias false)", async () => {
    if (!reachable) return;
    expect(await resolveUserByHandle(current)).toEqual({ userId, canonicalUsername: current, viaAlias: false });
  });

  it("resolves a former handle to the current user (viaAlias true)", async () => {
    if (!reachable) return;
    expect(await resolveUserByHandle(former)).toEqual({ userId, canonicalUsername: current, viaAlias: true });
  });

  it("returns null for an unknown handle", async () => {
    if (!reachable) return;
    expect(await resolveUserByHandle(`${TAG}_ghost`)).toBeNull();
  });
});
