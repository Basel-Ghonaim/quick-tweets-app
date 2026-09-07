/**
 * Password Reset — the boundary handlers against a REAL Postgres (opt-in).
 *
 * WI-2's own integration test proves the service's lifecycle. This one proves
 * what only the boundary can: that the **response a caller actually receives**
 * is byte-for-byte identical across all three branches `request` can take, and
 * that the flow completes through the handlers rather than through the service
 * directly.
 *
 * It drives the controller's handlers with recording request/response doubles.
 * There is no socket here and none is claimed: `supertest` is not a dependency
 * of this project and this Work Item does not add one, exactly as Channel
 * Verification's own HTTP Work Item did not. What is proven is everything the
 * handlers decide — status, body, headers, and the ordering of the send — over
 * real persistence.
 */

import type { NextFunction, Request, Response } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { env } from "../../../config/env.js";
import { prisma, runInTransaction } from "../../../shared/database/index.js";
import type { MailAdapter, MailMessage } from "../../mail-delivery/index.js";
import { createAuthRepository, createTokenRepository } from "../auth.repository.js";
import { createAuthService } from "../auth.service.js";
import { createPasswordResetController } from "./passwordReset.controller.js";
import { createPasswordResetRepository } from "./passwordReset.repository.js";
import { createPasswordResetService } from "./passwordReset.service.js";
import { maskEndpoint } from "./passwordReset.session.js";

const base = `itpwhttp${process.pid}x${Math.floor(process.hrtime()[1])}`;
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

/** The evidence recorder, recorded rather than performed — this suite proves
 *  the boundary, and the report's own destination is the composition root's. */
const proofs: Array<{ userId: number; endpoint: string }> = [];

const controllerWith = (mail: MailAdapter) =>
  createPasswordResetController(
    async (userId, endpoint) => void proofs.push({ userId, endpoint }),
    createPasswordResetService({
      proveChannel: async (userId, endpoint) => void proofs.push({ userId, endpoint }),
      repo: createPasswordResetRepository(),
      authRepo: createAuthRepository(),
      tokenRepo: createTokenRepository(),
      mail,
      runInTransaction,
      format: FORMAT,
      ttlMs: 10 * 60 * 1000,
      cooldownMs: 60 * 1000,
      responseFloorMs: 1,
    }),
  );

/** Records exactly what a caller would observe, and holds `finish` unfired. */
const recordingRes = () => {
  const finishers: Array<() => void> = [];
  const observed = {
    status: undefined as number | undefined,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    /** What the browser would be told to keep — the one channel a body cannot show. */
    cookies: [] as Array<{ name: string; options: Record<string, unknown> }>,
    cleared: [] as string[],
    key: undefined as string | undefined,
  };
  const res = {
    status: (code: number) => {
      observed.status = code;
      return res;
    },
    json: (payload: unknown) => {
      observed.body = payload;
      return res;
    },
    send: () => res,
    setHeader: (name: string, value: unknown) => {
      observed.headers[name] = value;
      return res;
    },
    cookie: (name: string, value: string, options: Record<string, unknown>) => {
      observed.cookies.push({ name, options });
      observed.key = value;
      return res;
    },
    clearCookie: (name: string) => {
      observed.cleared.push(name);
      return res;
    },
    on: (event: string, listener: () => void) => {
      if (event === "finish") finishers.push(listener);
      return res;
    },
  };
  return { res, observed, flush: () => finishers.forEach((l) => l()) };
};

const drive = async (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  body: Record<string, unknown>,
  cookies?: Record<string, string>,
) => {
  const { res, observed, flush } = recordingRes();
  const next = vi.fn();
  await handler(
    { body, cookies: cookies ?? {} } as unknown as Request,
    res as unknown as Response,
    next as unknown as NextFunction,
  );
  return { observed, flush, next };
};

describe("request answers identically in all three branches (I5)", () => {
  it("an unknown address, an eligible one, and one inside its cooldown are indistinguishable", async () => {
    if (!reachable) return;

    const username = usernameFor("neutral");
    const email = emailFor("neutral");
    await createAuthService().register({ username, email, password: "OldPassw0rd!" });

    const mail = capturingMail();
    const controller = controllerWith(mail.adapter);

    // Branch 1 — no account has this address.
    const unknown = await drive(controller.request, { email: emailFor("nobody") });
    // Branch 2 — a real account, eligible for a fresh code.
    const eligible = await drive(controller.request, { email });
    // Branch 3 — the same real account, now inside its resend cooldown.
    const cooling = await drive(controller.request, { email });

    /* Everything a caller can observe, except the key's own value — which is
       random by construction and would be a defect if it were not. */
    const observable = ({ observed }: typeof unknown) => ({
      status: observed.status,
      body: observed.body,
      headers: observed.headers,
      cookies: observed.cookies,
      cleared: observed.cleared,
    });

    /* The sharpest comparison, and the one that carries the guarantee: the
       SAME submitted address, eligible on one branch and inside its cooldown
       on the other. Everything observable must match byte for byte, the
       position's own body included. */
    const sameAddress = [eligible, cooling].map((r) => JSON.stringify(observable(r)));
    expect(new Set(sameAddress).size).toBe(1);

    /* Against a different submitted address only the mask may differ, and it
       is a function of what the caller typed rather than of what exists. */
    const withoutMask = (r: typeof unknown) => {
      const o = observable(r);
      const body = o.body as { success: boolean; data: Record<string, unknown> };
      const { maskedEndpoint: _mask, ...rest } = body.data;
      return JSON.stringify({ ...o, body: { success: body.success, data: rest } });
    };
    expect(new Set([unknown, eligible, cooling].map(withoutMask)).size).toBe(1);

    expect(JSON.parse(sameAddress[0]!)).toEqual({
      status: 202,
      body: {
        success: true,
        data: {
          step: "code",
          maskedEndpoint: maskEndpoint(email),
          retryAfterSeconds: Math.ceil(env.RESET_RESEND_COOLDOWN_MS / 1000),
          canResend: true,
        },
      },
      headers: {},
      cookies: [
        {
          name: "qt_reset",
          options: expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
        },
      ],
      cleared: [],
    });

    // The unknown branch masks what was typed, never something about an account.
    expect((unknown.observed.body as { data: { maskedEndpoint: string } }).data.maskedEndpoint)
      .toBe(maskEndpoint(emailFor("nobody")));

    /* A position issued on one branch and not another would be the disclosure
       the constant body exists to prevent — and no body would show it. */
    const keys = [unknown, eligible, cooling].map((r) => r.observed.key);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(3);

    // Only the eligible branch has anything to deliver, and it delivered
    // nothing until each response had already been written.
    expect(mail.sent).toHaveLength(0);
    unknown.flush();
    cooling.flush();
    expect(mail.sent).toHaveLength(0);
    eligible.flush();
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.to).toBe(email);

    for (const r of [unknown, eligible, cooling]) expect(r.next).not.toHaveBeenCalled();
  });
});

describe("the flow completes through the handlers", () => {
  it(
    "request → confirm → apply, then the new password works, the old does not, and every session is gone",
    async () => {
      if (!reachable) return;

      const username = usernameFor("flow");
      const email = emailFor("flow");
      const authSvc = createAuthService();
      await authSvc.register({ username, email, password: "OldPassw0rd!" });
      await authSvc.login({ identifier: username, password: "OldPassw0rd!" });

      const account = await prisma.user.findUniqueOrThrow({ where: { username } });
      expect(await prisma.refreshToken.count({ where: { userId: account.id } })).toBe(2);

      const mail = capturingMail();
      const controller = controllerWith(mail.adapter);

      const requested = await drive(controller.request, { email });
      expect(requested.observed.status).toBe(202);
      requested.flush();
      const code = codeIn(mail.sent[0]!);

      // The position the request opened is what carries the rest of the flow.
      const held = { qt_reset: requested.observed.key! };

      const position = await drive(controller.position, {}, held);
      expect(position.observed.body).toMatchObject({
        data: { step: "code", maskedEndpoint: expect.stringContaining("@") },
      });

      // Confirm consumes nothing: the same code checks out twice (D6).
      const first = await drive(controller.confirm, { code }, held);
      const second = await drive(controller.confirm, { code }, held);
      expect(first.observed.status).toBe(204);
      expect(second.observed.status).toBe(204);
      expect(first.observed.body).toBeUndefined();

      // Once a code is confirmed the position knows the step, and the caller
      // never sends the credential again.
      const atPassword = await drive(controller.position, {}, held);
      expect(atPassword.observed.body).toMatchObject({ data: { step: "password" } });

      const applied = await drive(controller.apply, { newPassword: "N3wPassw0rd!" }, held);
      expect(applied.observed.status).toBe(204);
      expect(applied.observed.cleared).toEqual(["qt_reset"]);
      expect(applied.observed.body).toBeUndefined();
      expect(applied.next).not.toHaveBeenCalled();

      // The password really changed, through the same path a login uses.
      await expect(
        authSvc.login({ identifier: username, password: "N3wPassw0rd!" }),
      ).resolves.toBeTruthy();
      await expect(
        authSvc.login({ identifier: username, password: "OldPassw0rd!" }),
      ).rejects.toThrow();

      // Every prior session is gone; only the post-reset login's own remains.
      expect(await prisma.refreshToken.count({ where: { userId: account.id } })).toBe(1);

      // Single use, decided by the write: the spent code cannot be replayed.
      const replay = await drive(controller.apply, { newPassword: "An0therPass!" }, held);
      expect(replay.observed.status).toBeUndefined();
      expect(replay.next.mock.calls[0]?.[0]).toMatchObject({
        statusCode: 400,
        message: "That reset code is not valid.",
      });
    },
    15_000,
  );
});

describe("unusable codes are indistinguishable at the boundary", () => {
  it("a never-issued code and a spent one produce the same status and message", async () => {
    if (!reachable) return;

    const username = usernameFor("opaque");
    const email = emailFor("opaque");
    await createAuthService().register({ username, email, password: "OldPassw0rd!" });

    const mail = capturingMail();
    const controller = controllerWith(mail.adapter);

    const requested = await drive(controller.request, { email });
    requested.flush();
    const code = codeIn(mail.sent[0]!);
    await drive(controller.apply, { code, newPassword: "N3wPassw0rd!" });

    const spent = await drive(controller.confirm, { code });
    const neverIssued = await drive(controller.confirm, { code: "FFFFFFFF" });
    const malformed = await drive(controller.confirm, { code: "not-a-code-at-all" });

    const answers = [spent, neverIssued, malformed].map((r) => {
      const err = r.next.mock.calls[0]?.[0] as { statusCode: number; message: string };
      return `${err.statusCode}|${err.message}`;
    });

    expect(new Set(answers).size).toBe(1);
    expect(answers[0]).toBe("400|That reset code is not valid.");
  });
});
