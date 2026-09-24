/**
 * Where suggested accounts are served: open to guests, with the query validated.
 * What the list contains is proved against the database.
 */

import { describe, expect, it } from "vitest";

import { optionalAuth } from "../../middleware/optionalAuth.js";
import { followRoutes } from "./follow.routes.js";

interface Layer {
  route: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}

const suggestionsLayer = () =>
  (followRoutes as unknown as { stack: Layer[] }).stack.find((l) => l.route.path === "/suggestions");

describe("GET /follows/suggestions", () => {
  it("is served, and only to GET", () => {
    expect(suggestionsLayer()?.route.methods).toEqual({ get: true });
  });

  it("is open to a guest, and validates its query before the controller", () => {
    const handlers = suggestionsLayer()!.route.stack.map((entry) => entry.handle);

    expect(handlers[0]).toBe(optionalAuth);
    expect(handlers).toHaveLength(3);
  });
});
