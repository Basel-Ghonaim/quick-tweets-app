import { describe, it, expect } from "vitest";
import { cursorQuerySchema } from "./cursor";

// Harness smoke test: proves the backend unit lane runs — Vitest executes, the
// TypeScript compiles, and a backend module (a Zod schema) imports and runs. It
// checks the schema's coercion and default with representative cases.
describe("cursorQuerySchema (harness smoke)", () => {
  it("coerces numeric query strings and applies the default limit", () => {
    expect(cursorQuerySchema.parse({ cursor: "42", limit: "5" })).toEqual({
      cursor: 42,
      limit: 5,
    });
    expect(cursorQuerySchema.parse({})).toEqual({ limit: 10 });
  });

  it("rejects an out-of-range limit", () => {
    expect(() => cursorQuerySchema.parse({ limit: "999" })).toThrow();
  });
});
