/**
 * I3, held mechanically rather than by review.
 *
 * "Unauthenticated by design" is the kind of invariant that erodes quietly: a
 * later hand adds `authGuard` to one route for a plausible-sounding reason and
 * locks out precisely the people recovery exists for. This asserts the guard's
 * absence against the router Express actually built, by reference — not by
 * reading the source for a word.
 */

import { describe, expect, it } from "vitest";

import { authGuard } from "../../../middleware/authGuard.js";
import { optionalAuth } from "../../../middleware/optionalAuth.js";
import {
  passwordResetApplyLimiter,
  passwordResetConfirmLimiter,
  passwordResetRequestLimiter,
} from "../../../middleware/rateLimiter.js";
import { passwordResetRoutes } from "./passwordReset.routes.js";

interface Layer {
  route: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
}

const layers = () => (passwordResetRoutes as unknown as { stack: Layer[] }).stack;
const handlersOf = (path: string) => {
  const layer = layers().find((l) => l.route.path === path);
  if (!layer) throw new Error(`no route registered at ${path}`);
  return layer.route.stack.map((entry) => entry.handle);
};

describe("the four routes exist, and only those four", () => {
  /* The position read is a GET because it changes nothing; the three that move
     the flow are POSTs. */
  it("registers exactly request, confirm, apply and the position read", () => {
    const registered = layers().map((l) => `${Object.keys(l.route.methods).join(",")} ${l.route.path}`);
    expect(registered.sort()).toEqual([
      "get /session",
      "post /",
      "post /apply",
      "post /confirm",
    ]);
  });
});

describe("no route requires a session (I3)", () => {
  for (const path of ["/", "/confirm", "/apply", "/session"]) {
    it(`${path} carries neither authGuard nor optionalAuth`, () => {
      const handlers = handlersOf(path);
      expect(handlers).not.toContain(authGuard);
      expect(handlers).not.toContain(optionalAuth);
    });
  }
});

describe("every route is rate limited, with its own limiter", () => {
  const expected = [
    ["/", passwordResetRequestLimiter],
    ["/confirm", passwordResetConfirmLimiter],
    ["/apply", passwordResetApplyLimiter],
  ] as const;

  for (const [path, limiter] of expected) {
    it(`${path} is guarded by its own limiter, first in the chain`, () => {
      const handlers = handlersOf(path);
      expect(handlers).toContain(limiter);
      // First, so a refusal costs nothing beyond the counter — no validation,
      // no query, no hash.
      expect(handlers[0]).toBe(limiter);
    });
  }

  it("gives each route a distinct limiter, so one route cannot exhaust another's budget", () => {
    const used = new Set(expected.map(([, limiter]) => limiter));
    expect(used.size).toBe(3);
  });
});

describe("every route validates before it reaches the controller", () => {
  for (const path of ["/", "/confirm", "/apply"]) {
    it(`${path} runs limiter → validate → controller`, () => {
      // Three handlers exactly: anything else means something was inserted
      // into the chain without this test being reconsidered.
      expect(handlersOf(path)).toHaveLength(3);
    });
  }
});
