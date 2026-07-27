/**
 * Avatar lifecycle — the real thing, against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Drives the real UserService (real repo,
 * real Media ports, real interactive transaction) through set → replace → remove,
 * asserting the `user-avatar:{id}` ledger moves exactly, the User row tracks the
 * reference, the object survives unreferenced after removal, and a policy
 * violation leaves the prior avatar intact (the transaction guarantee).
 *
 * Excluded from the default unit run (CI has no database).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { createUserService } from "./user.service.js";
import { mintToken } from "../media/media.tokens.js";

const TAG = `it-avatar-${process.pid}-${Math.floor(process.hrtime()[1])}`;
const svc = createUserService();

let reachable = false;
let userId = 0;
let seq = 0;

/** Seed a media object OWNED by the test user (an authenticated upload). */
const seedOwned = async (opts: { contentType?: string; size?: number } = {}): Promise<string> => {
  seq += 1;
  const token = mintToken();
  await prisma.mediaObject.create({
    data: {
      token,
      storageKey: `objects/${TAG}-${seq}`,
      contentType: opts.contentType ?? "image/png",
      size: opts.size ?? 1024,
      status: "ready",
      uploaderId: userId,
    },
  });
  return token;
};

const refByToken = async (token: string): Promise<number> => {
  const obj = await prisma.mediaObject.findUnique({ where: { token }, select: { id: true } });
  return obj!.id;
};

const avatarRefCount = (): Promise<number> =>
  prisma.mediaReference.count({ where: { referrer: `user-avatar:${userId}` } });

const avatarMediaId = async (): Promise<number | null> =>
  (await prisma.user.findUnique({ where: { id: userId }, select: { avatarMediaId: true } }))?.avatarMediaId ?? null;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: `${TAG}-u`, name: "Ada", email: `${TAG}@avatar.local`, passwordHash: "x" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (reachable) {
    await prisma.mediaReference.deleteMany({ where: { referrer: `user-avatar:${userId}` } });
    await prisma.mediaObject.deleteMany({ where: { storageKey: { startsWith: `objects/${TAG}` } } });
    await prisma.user.deleteMany({ where: { email: `${TAG}@avatar.local` } });
  }
  await prisma.$disconnect();
});

describe("avatar lifecycle — real Postgres", () => {
  it("set → replace → remove moves the user-avatar ledger and the User reference exactly", async () => {
    if (!reachable) return;
    const first = await seedOwned();
    const second = await seedOwned();
    const firstId = await refByToken(first);
    const secondId = await refByToken(second);

    // set
    await svc.updateMe(userId, { avatar: { token: first } });
    expect(await avatarMediaId()).toBe(firstId);
    expect(await avatarRefCount()).toBe(1);
    expect(await prisma.mediaReference.count({ where: { mediaId: firstId, referrer: `user-avatar:${userId}` } })).toBe(1);

    // replace
    await svc.updateMe(userId, { avatar: { token: second } });
    expect(await avatarMediaId()).toBe(secondId);
    expect(await avatarRefCount()).toBe(1); // still exactly one
    expect(await prisma.mediaReference.count({ where: { mediaId: firstId } })).toBe(0); // old ended

    // remove
    await svc.updateMe(userId, { avatar: null });
    expect(await avatarMediaId()).toBeNull();
    expect(await avatarRefCount()).toBe(0);

    // Both ex-avatars survive as owned, ready, unreferenced (M11's target — not deleted here).
    const survivors = await prisma.mediaObject.findMany({
      where: { id: { in: [firstId, secondId] } },
      select: { status: true, uploaderId: true },
    });
    expect(survivors.every((o) => o.status === "ready" && o.uploaderId === userId)).toBe(true);
  });

  it("a policy violation (GIF) is refused and leaves the prior avatar intact (transaction guarantee)", async () => {
    if (!reachable) return;
    const good = await seedOwned({ contentType: "image/png" });
    const goodId = await refByToken(good);
    await svc.updateMe(userId, { avatar: { token: good } });
    expect(await avatarMediaId()).toBe(goodId);

    const gif = await seedOwned({ contentType: "image/gif" });
    const err = await svc.updateMe(userId, { avatar: { token: gif } }).catch((e: unknown) => e);
    expect((err as { statusCode?: number }).statusCode).toBe(422);

    // The prior avatar is untouched; the rejected GIF never became referenced.
    expect(await avatarMediaId()).toBe(goodId);
    expect(await prisma.mediaReference.count({ where: { mediaId: await refByToken(gif) } })).toBe(0);

    await svc.updateMe(userId, { avatar: null }); // tidy for the next assertions
  });
});
