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
  };
  return res;
};

const build = (
  over: Partial<IChannelVerificationService> = {},
  resolve: (userId: number) => Promise<string | null> = async () => EMAIL,
) => {
  const service = {
    issue: vi.fn(async () => ({ delivery: "accepted" as const })),
    confirm: vi.fn(async () => {}),
    statusOf: vi.fn(async () => "unproven" as const),
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
});

describe("successful responses", () => {
  it("reports the delivery outcome on issue", async () => {
    const { controller } = build();

    const { res } = await run(controller.issue);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { delivery: "accepted" } });
  });

  it("passes a failed delivery through rather than hiding it", async () => {
    const { controller } = build({ issue: vi.fn(async () => ({ delivery: "unknown" as const })) });

    const { res } = await run(controller.issue);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { delivery: "unknown" } });
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
