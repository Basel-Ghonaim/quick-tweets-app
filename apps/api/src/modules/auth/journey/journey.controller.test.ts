import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../../shared/errors/index.js";
import { createJourneyController } from "./journey.controller.js";
import { JourneyError } from "./journey.errors.js";
import type { IJourneyService } from "./journey.types.js";

const yes = async () => true;

const invoke = async (service: IJourneyService) => {
  const controller = createJourneyController(yes, service);
  const next = vi.fn();
  const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as never;

  await controller.advance(
    { userId: 1, body: { to: "verify", outcome: "saved" } } as never,
    res,
    next,
  );

  return next.mock.calls[0]![0] as AppError;
};

/**
 * The two refusals mean different things inside the capability and must read
 * identically outside it. A caller that could tell them apart would learn
 * whether an account has a journey at all, which is the same disclosure the
 * phase itself refuses by collapsing "closed" and "never had one".
 */
describe("what a refused move discloses", () => {
  it("says the same thing whether the journey is missing or the move is illegal", async () => {
    const missing = await invoke({
      stateFor: async () => ({ phase: "none", profileOutcome: null }),
      advance: async () => {
        throw JourneyError.noJourney();
      },
    });

    const illegal = await invoke({
      stateFor: async () => ({ phase: "profile", profileOutcome: null }),
      advance: async () => {
        throw JourneyError.illegalTransition();
      },
    });

    expect(missing.statusCode).toBe(409);
    expect(illegal.statusCode).toBe(409);
    expect(missing.message).toBe(illegal.message);
  });
});
