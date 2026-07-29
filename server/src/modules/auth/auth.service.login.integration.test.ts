/**
 * Login by neutral identifier — against a REAL Postgres.
 *
 * Run with `npm run test:integration`. Seeds one real account (via the real
 * register path) and proves login succeeds by username AND by email, including
 * MIXED-CASE inputs that must normalize (`trim().toLowerCase()`) and resolve,
 * while a wrong password and an unknown identifier both return the generic 401.
 * TAG-scoped seed rows are removed on teardown (the account cascade drops tokens).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { prisma } from "../../shared/database/index.js";
import { createAuthService } from "./auth.service.js";

const base = `itlogin${process.pid}x${Math.floor(process.hrtime()[1])}`; // lowercase, valid username
const email = `${base}@it.local`;
const PASSWORD = "Passw0rd!";
const svc = createAuthService(); // real repos + transaction runner

let reachable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  await svc.register({ username: base, name: "Login IT", email, password: PASSWORD });
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.user.deleteMany({ where: { username: { startsWith: base } } });
  }
  await prisma.$disconnect();
});

const statusOf = async (identifier: string, password = PASSWORD): Promise<number | "ok"> => {
  try {
    await svc.login({ identifier, password });
    return "ok";
  } catch (e) {
    return e instanceof AppError ? e.statusCode : -1;
  }
};

describe("login by neutral identifier — real Postgres", () => {
  it("succeeds by exact username", async () => {
    if (!reachable) return;
    expect(await statusOf(base)).toBe("ok");
  });

  it("succeeds by MIXED-CASE username (normalized)", async () => {
    if (!reachable) return;
    expect(await statusOf(`  ${base.toUpperCase()}  `)).toBe("ok");
  });

  it("succeeds by exact email", async () => {
    if (!reachable) return;
    expect(await statusOf(email)).toBe("ok");
  });

  it("succeeds by MIXED-CASE email (normalized)", async () => {
    if (!reachable) return;
    expect(await statusOf(`${base.toUpperCase()}@IT.LOCAL`)).toBe("ok");
  });

  it("returns the generic 401 for a wrong password", async () => {
    if (!reachable) return;
    expect(await statusOf(base, "WrongPass1!")).toBe(401);
  });

  it("returns the generic 401 for an unknown identifier", async () => {
    if (!reachable) return;
    expect(await statusOf("nobody_zzz_unknown")).toBe(401);
    expect(await statusOf("nobody@unknown.local")).toBe(401);
  });
});
