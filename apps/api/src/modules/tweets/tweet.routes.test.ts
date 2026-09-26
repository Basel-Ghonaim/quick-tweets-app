/**
 * Where the tweets module's guards sit: the edit limit, and the reader on the list a search
 * shares with the feed. What each guard decides is proved beside it.
 */

import { describe, expect, it } from "vitest";

import { authGuard } from "../../middleware/authGuard.js";
import { editLimiter } from "../../middleware/rateLimiter.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { commentRoutes } from "../comments/comment.routes.js";
import { tweetRoutes } from "./tweet.routes.js";

interface Layer {
  route: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}

const layersOf = (router: unknown) => (router as { stack: Layer[] }).stack;
const handlersOf = (router: unknown, method: string, path: string) => {
  const layer = layersOf(router).find((l) => l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`no ${method} route at ${path}`);
  return layer.route.stack.map((entry) => entry.handle);
};

describe("the edit limit sits on editing a post", () => {
  it("runs after authGuard, which names the account, and before validation", () => {
    const handlers = handlersOf(tweetRoutes, "patch", "/:id");

    expect(handlers[0]).toBe(authGuard);
    expect(handlers[1]).toBe(editLimiter);
    // Validation and the controller come after it, so an invalid attempt still counts.
    expect(handlers).toHaveLength(4);
  });
});

describe("and nowhere else", () => {
  it("is on no other route of the tweets module", () => {
    const others = layersOf(tweetRoutes).filter((l) => !(l.route.path === "/:id" && l.route.methods.patch));

    for (const layer of others) {
      expect(layer.route.stack.map((entry) => entry.handle)).not.toContain(editLimiter);
    }
  });

  it("is on no comment route: editing a comment stays under the general limit", () => {
    for (const layer of layersOf(commentRoutes)) {
      expect(layer.route.stack.map((entry) => entry.handle)).not.toContain(editLimiter);
    }
  });
});

describe("the list a search shares with the feed", () => {
  it("reads a token when one is sent, and serves a guest without one", () => {
    const handlers = handlersOf(tweetRoutes, "get", "/");

    expect(handlers[0]).toBe(optionalAuth);
    expect(handlers).not.toContain(authGuard);
  });
});
