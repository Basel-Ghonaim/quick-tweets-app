/**
 * Username rename — against a REAL Postgres. Run with `npm run test:integration`.
 * Proves the rename updates the user + reserves the old handle, that the same
 * user id still resolves after the rename (the session is id-based — Guarantee 1),
 * that a former handle resolves to the current user (Guarantee 2), and that a
 * handle held by another account (current or reserved) is a 409. TAG-scoped.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { AppError } from "../../shared/errors/index.js";
import { resolveUserByHandle } from "../../shared/identity/index.js";
import { createAuthService } from "../auth/auth.service.js";
import { createUserService } from "./user.service.js";

const TAG = `itrename${process.pid}x${Math.floor(process.hrtime()[1])}`;
const svc = createUserService();
const orig = `${TAG}_a`;
const other = `${TAG}_b`;
let reachable = false;
let userId = 0;
let otherId = 0;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  userId = (await prisma.user.create({ data: { username: orig, email: `${TAG}a@it.local`, passwordHash: "x" } })).id;
  otherId = (await prisma.user.create({ data: { username: other, email: `${TAG}b@it.local`, passwordHash: "x" } })).id;
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.usernameAlias.deleteMany({ where: { username: { startsWith: TAG } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: TAG } } });
  }
  await prisma.$disconnect();
});

describe("username rename — real Postgres", () => {
  const renamed = `${TAG}_a2`;

  it("renames the user, reserves the old handle, and keeps the id-based session", async () => {
    if (!reachable) return;

    const res = await svc.updateMe(userId, { username: renamed });
    expect(res.username).toBe(renamed); // the response is the authoritative new identity (G1)

    // The same user id still resolves to the account — the session never went stale.
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    expect(row?.username).toBe(renamed);

    // The old handle is reserved and resolves to the current user (G2).
    const alias = await prisma.usernameAlias.findUnique({ where: { username: orig }, select: { userId: true } });
    expect(alias?.userId).toBe(userId);
    expect(await resolveUserByHandle(orig)).toEqual({ userId, canonicalUsername: renamed, viaAlias: true });
  });

  it("409s a rename to a handle held by another account", async () => {
    if (!reachable) return;
    const err = await svc.updateMe(userId, { username: other }).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(409);
  });

  it("409s a rename to another account's reserved former handle", async () => {
    if (!reachable) return;
    // `orig` is now reserved by userId — the other account cannot take it.
    const err = await svc.updateMe(otherId, { username: orig }).catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(409);
  });

  it("blocks registering a new account with a reserved former handle", async () => {
    if (!reachable) return;
    // `orig` is a reserved alias — registration must reject it (no re-registration).
    const err = await createAuthService()
      .register({ username: orig, email: `${TAG}c@it.local`, password: "Passw0rd!" })
      .catch((e: unknown) => e);
    expect((err as AppError).statusCode).toBe(409);
  });
});
