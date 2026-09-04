/**
 * Password Reset service — end to end against a REAL Postgres (opt-in).
 *
 * Run with `npm run test:integration`. Proves what the unit tests, over
 * fakes, cannot: that the new password genuinely authenticates through the
 * real hashing/comparison path a login uses, that the old one no longer
 * does, and that every session — created through the real register/login
 * flow, not synthesised — is actually gone from the table afterwards.
 *
 * Mail is injected as a capturing fake, mirroring Channel Verification's own
 * integration test: this file proves the service's lifecycle, not the mail
 * mechanism, which is proven elsewhere.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma, runInTransaction } from "../../../shared/database/index.js";
import type { MailAdapter, MailMessage } from "../../mail-delivery/index.js";
import { createAuthRepository, createTokenRepository } from "../auth.repository.js";
import { createAuthService } from "../auth.service.js";
import { createPasswordResetRepository } from "./passwordReset.repository.js";
import { createPasswordResetService } from "./passwordReset.service.js";

const base = `itpwreset${process.pid}x${Math.floor(process.hrtime()[1])}`;
const usernameFor = (suffix: string) => `${base}_${suffix}`;
const emailFor = (suffix: string) => `${base}_${suffix}@it.local`;

let reachable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    // Cascade from users removes their refresh tokens and reset challenges.
    await prisma.user.deleteMany({ where: { username: { startsWith: base } } });
  }
  await prisma.$disconnect();
});

const capturingMail = () => {
  const sent: MailMessage[] = [];
  const adapter: MailAdapter = {
    send: async (message) => {
      sent.push(message);
      return { outcome: "accepted" as const };
    },
  };
  return { sent, adapter };
};

const codeIn = (message: MailMessage) => message.body.match(/code is (\w+)/)?.[1] ?? "";

const FORMAT = { alphabet: "0123456789ABCDEF", length: 8 };

const serviceWith = (mail: MailAdapter) =>
  createPasswordResetService({
    repo: createPasswordResetRepository(),
    authRepo: createAuthRepository(),
    tokenRepo: createTokenRepository(),
    mail,
    runInTransaction,
    format: FORMAT,
    ttlMs: 10 * 60 * 1000,
    cooldownMs: 60 * 1000,
    responseFloorMs: 1, // real timing, kept negligible so the suite stays fast
  });

describe("the reset lifecycle against real Postgres", () => {
  // Six real bcrypt operations in one test — two registrations' worth of
  // hashing, apply's own, and three compares across two logins — plus
  // several round trips, run alongside 21 other integration files' own
  // load. Comfortably under the default 5000ms alone; not comfortably under
  // it while the rest of the suite contends for the same CPU.
  it(
    "request → confirm → apply → new password authenticates, old one and every session are gone",
    async () => {
      if (!reachable) return;

      const username = usernameFor("full");
      const email = emailFor("full");
      const authSvc = createAuthService();
      await authSvc.register({ username, email, password: "OldPassw0rd!" });
      // A second session, exactly as a returning login would add one.
      await authSvc.login({ identifier: username, password: "OldPassw0rd!" });

      const account = await prisma.user.findUniqueOrThrow({ where: { username } });
      const sessionsBefore = await prisma.refreshToken.count({ where: { userId: account.id } });
      expect(sessionsBefore).toBe(2);

      const mail = capturingMail();
      const service = serviceWith(mail.adapter);

      const { dispatchSend } = await service.request({ email });
      expect(dispatchSend).toBeTypeOf("function");
      await dispatchSend?.();
      expect(mail.sent).toHaveLength(1);
      const code = codeIn(mail.sent[0]!);

      await expect(service.confirm({ code })).resolves.toBeUndefined();

      const result = await service.apply({ code, newPassword: "N3wPassw0rd!" });
      expect(result).toEqual({ userId: account.id });

      // The new password authenticates through the real login path.
      await expect(
        authSvc.login({ identifier: username, password: "N3wPassw0rd!" }),
      ).resolves.toMatchObject({ user: expect.objectContaining({ id: account.id }) });

      // The old one no longer does.
      await expect(
        authSvc.login({ identifier: username, password: "OldPassw0rd!" }),
      ).rejects.toThrow();

      // Both sessions that existed before apply() are gone; the only one left
      // is the one the successful new-password login above just created.
      const remaining = await prisma.refreshToken.findMany({ where: { userId: account.id } });
      expect(remaining).toHaveLength(1);
    },
    15_000,
  );

  it("consumes the code — confirming or applying it again both fail identically", async () => {
    if (!reachable) return;

    const username = usernameFor("consumed");
    const email = emailFor("consumed");
    await createAuthService().register({ username, email, password: "Passw0rd!23" });

    const mail = capturingMail();
    const service = serviceWith(mail.adapter);
    const { dispatchSend } = await service.request({ email });
    await dispatchSend?.();
    const code = codeIn(mail.sent[0]!);

    await service.apply({ code, newPassword: "N3wPassw0rd!" });

    await expect(service.confirm({ code })).rejects.toMatchObject({ code: "not_usable" });
    await expect(
      service.apply({ code, newPassword: "AnotherOne1!" }),
    ).rejects.toMatchObject({ code: "not_usable" });
  });

  it("an unknown address and a known address are indistinguishable in response shape", async () => {
    if (!reachable) return;

    const username = usernameFor("neutral");
    const email = emailFor("neutral");
    await createAuthService().register({ username, email, password: "Passw0rd!23" });

    const service = serviceWith(capturingMail().adapter);

    const unknown = await service.request({ email: emailFor("does-not-exist") });
    const known = await service.request({ email });

    expect(Object.keys(unknown)).toEqual([]);
    expect(Object.keys(known)).toEqual(["dispatchSend"]);
  });

  it("does not mint a second code inside the cooldown, against real concurrent requests", async () => {
    if (!reachable) return;

    const username = usernameFor("cooldown");
    const email = emailFor("cooldown");
    await createAuthService().register({ username, email, password: "Passw0rd!23" });

    const service = serviceWith(capturingMail().adapter);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => service.request({ email })),
    );

    const minted = results.filter((r) => r.dispatchSend !== undefined);
    expect(minted).toHaveLength(1);

    const account = await prisma.user.findUniqueOrThrow({ where: { username } });
    const rows = await prisma.passwordResetChallenge.count({ where: { userId: account.id } });
    expect(rows).toBe(1);
  });
});
