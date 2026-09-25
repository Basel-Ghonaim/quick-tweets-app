/**
 * Who may read the trending list: anyone. Its route carries no guard, so a guest reads it
 * and a token is never examined.
 */

import { describe, expect, it } from "vitest";

import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { trendRoutes } from "./trend.routes.js";

interface Layer {
  route: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}

describe("GET /trends", () => {
  it("is the router's one route, and passes straight to its handler", () => {
    const layers = (trendRoutes as unknown as { stack: Layer[] }).stack;

    expect(layers.map((l) => [l.route.path, Object.keys(l.route.methods)])).toEqual([["/", ["get"]]]);
    const handlers = layers[0]!.route.stack.map((entry) => entry.handle);
    expect(handlers).toHaveLength(1);
    expect(handlers).not.toContain(authGuard);
    expect(handlers).not.toContain(optionalAuth);
  });
});
