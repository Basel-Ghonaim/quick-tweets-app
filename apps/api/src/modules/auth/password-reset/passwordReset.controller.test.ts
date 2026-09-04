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

const build = (over: Partial<IPasswordResetService> = {}) => {
  const service = {
    request: vi.fn(async () => ({})),
    confirm: vi.fn(async () => {}),
    apply: vi.fn(async () => ({ userId: 1 })),
    ...over,
  };
  return {
    service,
    controller: createPasswordResetController(service as unknown as IPasswordResetService),
  };
};

const call = async (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  body: Record<string, unknown>,
) => {
  const res = fakeRes();
  const next = vi.fn();
  await handler({ body } as Request, res as unknown as Response, next as unknown as NextFunction);
  return { res, next };
};

describe("request — one answer, whatever happened", () => {
  it("returns 202 with a constant body when a code was minted", async () => {
    const { controller } = build({ request: vi.fn(async () => ({ dispatchSend: async () => {} })) });
    const { res } = await call(controller.request, { email: "known@example.test" });

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("returns the identical 202 when no code was minted", async () => {
    const { controller } = build({ request: vi.fn(async () => ({})) });
    const { res } = await call(controller.request, { email: "unknown@example.test" });

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("sends no Retry-After and no cooldown hint on any branch", async () => {
    for (const outcome of [{}, { dispatchSend: async () => {} }]) {
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
    const { controller } = build({ request: vi.fn(async () => ({ dispatchSend })) });

    const { res } = await call(controller.request, { email: "known@example.test" });

    // The response is fully written and the send has still not happened.
    expect(res.json).toHaveBeenCalled();
    expect(dispatchSend).not.toHaveBeenCalled();

    res.flush();
    expect(dispatchSend).toHaveBeenCalledTimes(1);
  });

  it("registers no finish listener at all when nothing was minted", async () => {
    const { controller } = build({ request: vi.fn(async () => ({})) });
    const { res } = await call(controller.request, { email: "unknown@example.test" });

    expect(res.finishListenerCount()).toBe(0);
  });

  it("does not surface a send that rejects — the response is long gone", async () => {
    const dispatchSend = vi.fn(async () => {
      throw new Error("relay unreachable");
    });
    const { controller } = build({ request: vi.fn(async () => ({ dispatchSend })) });

    const { res, next } = await call(controller.request, { email: "known@example.test" });
    expect(() => res.flush()).not.toThrow();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("confirm and apply — the shapes they answer with", () => {
  it("confirm reports usability with 204 and no body", async () => {
    const { controller, service } = build();
    const { res } = await call(controller.confirm, { code: "0123456789AB" });

    expect(service.confirm).toHaveBeenCalledWith({ code: "0123456789AB" });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
  });

  it("apply answers 204 and returns no session of its own", async () => {
    const { controller, service } = build();
    const { res } = await call(controller.apply, {
      code: "0123456789AB",
      newPassword: "Str0ng!Passw0rd",
    });

    expect(service.apply).toHaveBeenCalledWith({
      code: "0123456789AB",
      newPassword: "Str0ng!Passw0rd",
    });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
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
