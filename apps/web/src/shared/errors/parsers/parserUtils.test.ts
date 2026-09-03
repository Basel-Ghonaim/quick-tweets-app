import { describe, expect, it } from "vitest";
import { buildAppError } from "./parserUtils";

describe("a 429 keeps the refusal the backend named", () => {
  it("resolves the edge limiter to itself rather than to the resource throttle", () => {
    expect(buildAppError(429, "rate_limit").type).toBe("rate_limit");
  });

  it("resolves the resource throttle to itself", () => {
    expect(buildAppError(429, "too_many_requests").type).toBe("too_many_requests");
  });

  it("falls back by status only when the type is one it does not know", () => {
    expect(buildAppError(429, "invented_by_nobody").type).toBe("too_many_requests");
    expect(buildAppError(429).type).toBe("too_many_requests");
  });
});
