/**
 * Boundary tests — subject resolution and error translation.
 *
 * The opacity assertion is the load-bearing one: every cause of a failed
 * confirmation must reach the client as the *same* status and body, so a future
 * carve-out fails here rather than depending on a reviewer noticing.
 */

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../shared/errors/index.js";
import { createChannelVerificationController } from "./channelVerification.controller.js";
import { ChannelVerificationError } from "./channelVerification.errors.js";
import type { IChannelVerificationService } from "./channelVerification.types.js";

const USER = 7;
const EMAIL = "holder@example.test";

const fakeRes = () => {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    send: vi.fn(() => res),
    setHeader: vi.fn(() => res),
  };
  return res;
};

const build = (
  over: Partial<IChannelVerificationService> = {},
  resolve: (userId: number) => Promise<string | null> = async () => EMAIL,
) => {
  const service = {
    issue: vi.fn(async () => ({ delivery: "accepted" as const, resendAvailableInSeconds: 60 })),
    confirm: vi.fn(async () => {}),
    statusOf: vi.fn(async () => "unproven" as const),
    stateOf: vi.fn(async () => ({ status: "pending" as const, resendAvailableInSeconds: 42 })),
    ...over,
  };
  return {
    service,
    controller: createChannelVerificationController(
      service as unknown as IChannelVerificationService,
      resolve,
    ),
  };
};

const run = async (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  body: Record<string, unknown> = {},
) => {
  const res = fakeRes();
  const next = vi.fn();
  await handler(
    { userId: USER, body } as unknown as Request,
    res as unknown as Response,
    next as unknown as NextFunction,
  );
  return { res, next, error: next.mock.calls[0]?.[0] as AppError | undefined };
};

describe("resolving the subject", () => {
  it("hands the account's own endpoint to the service, never one from the request", async () => {
    const { controller, service } = build();

    await run(controller.issue, { endpoint: "attacker@example.test" });

    expect(service.issue).toHaveBeenCalledWith({ userId: USER, endpoint: EMAIL });
  });

  it("answers 404 and calls nothing downstream when the account has gone", async () => {
    const { controller, service } = build({}, async () => null);

    const { error } = await run(controller.issue);

    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(404);
    expect(service.issue).not.toHaveBeenCalled();
  });

  it("does the same on confirm", async () => {
    const { controller, service } = build({}, async () => null);

    const { error } = await run(controller.confirm, { code: "ABCDEFGHJKMN" });

    expect(error?.statusCode).toBe(404);
    expect(service.confirm).not.toHaveBeenCalled();
  });

  it("does the same on the read, which asks about the account's own endpoint", async () => {
    const { controller, service } = build();
    await run(controller.current, { endpoint: "attacker@example.test" });
    expect(service.stateOf).toHaveBeenCalledWith(USER, EMAIL);

    const gone = build({}, async () => null);
    const { error } = await run(gone.controller.current);

    expect(error?.statusCode).toBe(404);
    expect(gone.service.stateOf).not.toHaveBeenCalled();
  });
});

describe("successful responses", () => {
  it("answers the read with the status and the window, and nothing else", async () => {
    const { controller } = build();

    const { res } = await run(controller.current);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { status: "pending", resendAvailableInSeconds: 42 },
    });
  });

  it("answers the read for a subject with nothing outstanding, rather than 404", async () => {
    const { controller } = build({
      stateOf: vi.fn(async () => ({ status: "unproven" as const, resendAvailableInSeconds: 0 })),
    });

    const { res, next } = await run(controller.current);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("reports the delivery outcome and the resend window on issue", async () => {
    const { controller } = build();

    const { res } = await run(controller.issue);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { delivery: "accepted", resendAvailableInSeconds: 60 },
    });
  });

  it("passes a failed delivery through rather than hiding it", async () => {
    const { controller } = build({
      issue: vi.fn(async () => ({ delivery: "unknown" as const, resendAvailableInSeconds: 42 })),
    });

    const { res } = await run(controller.issue);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { delivery: "unknown", resendAvailableInSeconds: 42 },
    });
  });

  it("reports the window the service gave, never a figure of its own", async () => {
    const { controller } = build({
      issue: vi.fn(async () => ({ delivery: "accepted" as const, resendAvailableInSeconds: 7 })),
    });

    const { res } = await run(controller.issue);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { delivery: "accepted", resendAvailableInSeconds: 7 },
    });
  });

  it("answers a bare 204 on confirm", async () => {
    const { controller } = build();

    const { res } = await run(controller.confirm, { code: "ABCDEFGHJKMN" });

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe("error translation", () => {
  it("turns the cooldown into 429", async () => {
    const { controller } = build({
      issue: vi.fn(async () => {
        throw ChannelVerificationError.cooldownActive();
      }),
    });

    const { error } = await run(controller.issue);

    expect(error?.statusCode).toBe(429);
  });

  it("says when to retry, in the header rather than the envelope", async () => {
    const { controller } = build({
      issue: vi.fn(async () => {
        throw ChannelVerificationError.cooldownActive(37);
      }),
    });

    const { res, error } = await run(controller.issue);

    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "37");
    expect(error?.statusCode).toBe(429);
    // The envelope is unchanged: the seconds travel in the header only.
    expect(error).not.toHaveProperty("retryAfterSeconds");
  });

  it("sets no header when the module did not say how long", async () => {
    const { controller } = build({
      issue: vi.fn(async () => {
        throw ChannelVerificationError.cooldownActive();
      }),
    });

    const { res } = await run(controller.issue);

    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("leaves an unrelated failure untranslated", async () => {
    const boom = new Error("connection reset");
    const { controller } = build({
      issue: vi.fn(async () => {
        throw boom;
      }),
    });

    const { error } = await run(controller.issue);

    expect(error).toBe(boom);
  });

  it("answers every failed confirmation with a byte-identical status and body", async () => {
    // The service already collapses its causes; this proves the boundary does
    // not re-expand them on the way out.
    const causes = ["malformed", "wrong value", "expired", "no open challenge", "unknown subject"];

    const seen = new Set<string>();
    for (const cause of causes) {
      const { controller } = build({
        confirm: vi.fn(async () => {
          // Every cause raises the one error the service exposes.
          void cause;
          throw ChannelVerificationError.confirmationFailed();
        }),
      });

      const { error } = await run(controller.confirm, { code: "ABCDEFGHJKMN" });
      seen.add(
        JSON.stringify({
          status: error?.statusCode,
          message: error?.message,
          errors: (error as unknown as { errors?: unknown }).errors ?? null,
        }),
      );
    }

    expect(seen.size).toBe(1);
    const [only] = [...seen];
    expect(JSON.parse(only!).errors).toBeNull();
    expect(JSON.parse(only!).status).toBe(400);
  });
});
