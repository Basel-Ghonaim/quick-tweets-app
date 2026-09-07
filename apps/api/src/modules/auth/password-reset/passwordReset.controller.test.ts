/**
 * Boundary tests — neutrality, deferred dispatch, and error translation.
 *
 * Two are load-bearing. Every cause of an unusable code must reach the client
 * as the *same* status and body, so a future carve-out fails here rather than
 * depending on a reviewer noticing. And the mail send must not be reachable
 * before the response is flushed, because a send inside the timed path is the
 * oracle the constant body exists to deny.
 */

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../../shared/errors/index.js";
import { createPasswordResetController } from "./passwordReset.controller.js";
import { PasswordResetError } from "./passwordReset.errors.js";
import type { IPasswordResetService } from "./passwordReset.types.js";

/** A response that records what was sent and holds its `finish` listeners unfired. */
const fakeRes = () => {
  const listeners: Record<string, Array<() => void>> = {};
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    send: vi.fn(() => res),
    setHeader: vi.fn(() => res),
    cookie: vi.fn(() => res),
    clearCookie: vi.fn(() => res),
    on: vi.fn((event: string, listener: () => void) => {
      (listeners[event] ??= []).push(listener);
      return res;
    }),
    /** Nothing calls this for us — Express would, once the last byte is out. */
    flush: () => listeners.finish?.forEach((l) => l()),
    finishListenerCount: () => listeners.finish?.length ?? 0,
  };
  return res;
};

const noProof = async () => {};

const build = (over: Partial<IPasswordResetService> = {}) => {
  const service = {
    request: vi.fn(async () => ({ sessionKey: "key" })),
    confirm: vi.fn(async () => {}),
    positionOf: vi.fn(async () => ({ step: "request" as const, maskedEndpoint: null })),
    apply: vi.fn(async () => ({ userId: 1 })),
    ...over,
  };
  return {
    service,
    controller: createPasswordResetController(noProof, service as unknown as IPasswordResetService),
  };
};

const call = async (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  body: Record<string, unknown>,
) => {
  const res = fakeRes();
  const next = vi.fn();
  await handler(
    { body, cookies: {} } as unknown as Request,
    res as unknown as Response,
    next as unknown as NextFunction,
  );
  return { res, next };
};

describe("request — one answer, whatever happened", () => {
  it("returns 202 with a constant body when a code was minted", async () => {
    const { controller } = build({ request: vi.fn(async () => ({ dispatchSend: async () => {}, sessionKey: "key" })) });
    const { res } = await call(controller.request, { email: "known@example.test" });

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("returns the identical 202 when no code was minted", async () => {
    const { controller } = build({ request: vi.fn(async () => ({ sessionKey: "key" })) });
    const { res } = await call(controller.request, { email: "unknown@example.test" });

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("sends no Retry-After and no cooldown hint on any branch", async () => {
    for (const outcome of [
      { sessionKey: "k" },
      { sessionKey: "k", dispatchSend: async () => {} },
    ]) {
      const { controller } = build({ request: vi.fn(async () => outcome) });
      const { res } = await call(controller.request, { email: "a@example.test" });

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
    }
  });
});

describe("request — the send is dispatched after the response, never inside it", () => {
  it("does not call dispatchSend while producing the response", async () => {
    const dispatchSend = vi.fn(async () => {});
    const { controller } = build({ request: vi.fn(async () => ({ dispatchSend, sessionKey: "key" })) });

    const { res } = await call(controller.request, { email: "known@example.test" });

    // The response is fully written and the send has still not happened.
    expect(res.json).toHaveBeenCalled();
    expect(dispatchSend).not.toHaveBeenCalled();

    res.flush();
    expect(dispatchSend).toHaveBeenCalledTimes(1);
  });

  it("registers no finish listener at all when nothing was minted", async () => {
    const { controller } = build({ request: vi.fn(async () => ({ sessionKey: "key" })) });
    const { res } = await call(controller.request, { email: "unknown@example.test" });

    expect(res.finishListenerCount()).toBe(0);
  });

  it("does not surface a send that rejects — the response is long gone", async () => {
    const dispatchSend = vi.fn(async () => {
      throw new Error("relay unreachable");
    });
    const { controller } = build({ request: vi.fn(async () => ({ dispatchSend, sessionKey: "key" })) });

    const { res, next } = await call(controller.request, { email: "known@example.test" });
    expect(() => res.flush()).not.toThrow();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("confirm and apply — the shapes they answer with", () => {
  it("confirm reports usability with 204 and no body", async () => {
    const { controller, service } = build();
    const { res } = await call(controller.confirm, { code: "0123456789AB" });

    expect(service.confirm).toHaveBeenCalledWith({
      code: "0123456789AB",
      sessionKey: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
  });

  /* The credential is the position's, so the boundary passes a key and never a
     code — a caller able to supply one would be a second source for it. */
  it("apply carries the position, never a code", async () => {
    const { controller, service } = build();
    const { res } = await call(controller.apply, { newPassword: "Str0ng!Passw0rd" });

    expect(service.apply).toHaveBeenCalledWith({
      sessionKey: undefined,
      newPassword: "Str0ng!Passw0rd",
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
  });

  it("clears the position once the reset completes", async () => {
    const { controller } = build();
    const { res } = await call(controller.apply, { newPassword: "Str0ng!Passw0rd" });

    expect(res.clearCookie).toHaveBeenCalledWith("qt_reset", expect.objectContaining({
      httpOnly: true,
      path: "/api/v1/auth/password-reset",
    }));
  });

  /* A position issued on one branch and not another would be the disclosure
     the constant body exists to prevent, and no body would show it. */
  it("issues a position on every branch alike", async () => {
    const minted = await call(
      build({ request: vi.fn(async () => ({ dispatchSend: async () => {}, sessionKey: "k" })) })
        .controller.request,
      { email: "real@x.test" },
    );
    const silent = await call(
      build({ request: vi.fn(async () => ({ sessionKey: "k" })) }).controller.request,
      { email: "unknown@x.test" },
    );

    for (const { res } of [minted, silent]) {
      expect(res.cookie).toHaveBeenCalledWith("qt_reset", "k", expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
      }));
    }
  });

  it("answers where a reader stands without a status to read", async () => {
    const { controller } = build({
      positionOf: vi.fn(async () => ({
        step: "password" as const,
        maskedEndpoint: "b•••@x.test",
        retryAfterSeconds: 12,
        canResend: true,
      })),
    });
    const { res } = await call(controller.position, {});

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        step: "password",
        maskedEndpoint: "b•••@x.test",
        retryAfterSeconds: 12,
        canResend: true,
      },
    });
  });
});

describe("every unusable code answers identically", () => {
  // The service raises one error for all of them; this asserts the boundary
  // keeps it that way. A carve-out added later fails right here.
  const causes = ["never issued", "expired", "already used", "malformed", "simply wrong"];

  it("maps each cause to the same 400 and the same message", async () => {
    const seen = new Set<string>();

    for (const _cause of causes) {
      const { controller } = build({
        confirm: vi.fn(async () => {
          throw PasswordResetError.notUsable();
        }),
      });
      const { next } = await call(controller.confirm, { code: "whatever" });

      const err = next.mock.calls[0]?.[0] as AppError;
      expect(err).toBeInstanceOf(AppError);
      seen.add(`${err.statusCode}|${err.message}`);
    }

    expect(seen.size).toBe(1);
    expect([...seen][0]).toBe("400|That reset code is not valid.");
  });

  it("maps apply's failures to the same 400 as confirm's", async () => {
    const { controller } = build({
      apply: vi.fn(async () => {
        throw PasswordResetError.notUsable();
      }),
    });
    const { next } = await call(controller.apply, { code: "x", newPassword: "Str0ng!Passw0rd" });

    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("That reset code is not valid.");
  });
});

describe("a configuration fault is not a caller's mistake", () => {
  it("passes invalid_format through untranslated, so it surfaces as a server error", async () => {
    const { controller } = build({
      confirm: vi.fn(async () => {
        throw PasswordResetError.invalidFormat();
      }),
    });
    const { next } = await call(controller.confirm, { code: "0123456789AB" });

    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(PasswordResetError);
    expect(err).not.toBeInstanceOf(AppError);
  });
});
