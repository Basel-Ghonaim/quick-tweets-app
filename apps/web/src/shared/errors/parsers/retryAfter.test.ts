import { describe, expect, it } from "vitest";
import { buildAppError, retryAfterSeconds } from "./parserUtils";

describe("retryAfterSeconds", () => {
  it("reads the delta-seconds form the API sends", () => {
    expect(retryAfterSeconds("40")).toBe(40);
  });

  it("rounds up, because a partial second still has to be waited out", () => {
    expect(retryAfterSeconds("39.2")).toBe(40);
  });

  it("reads zero, which says the wait is over rather than absent", () => {
    expect(retryAfterSeconds("0")).toBe(0);
  });

  it("carries nothing when the header is absent or not a number", () => {
    expect(retryAfterSeconds(undefined)).toBeUndefined();
    expect(retryAfterSeconds("")).toBeUndefined();
    expect(retryAfterSeconds("Wed, 21 Oct 2026 07:28:00 GMT")).toBeUndefined();
    expect(retryAfterSeconds("-5")).toBeUndefined();
  });
});

describe("the window reaches the error a caller sees", () => {
  it("is carried on a refusal that named one", () => {
    expect(buildAppError(429, "too_many_requests", undefined, 40).retryAfterSeconds).toBe(40);
  });

  it("is absent on a refusal that named none, rather than defaulted", () => {
    expect(buildAppError(429, "rate_limit").retryAfterSeconds).toBeUndefined();
  });

  it("survives the projection the store holds", () => {
    expect(
      buildAppError(429, "too_many_requests", undefined, 40).toSerialized().retryAfterSeconds,
    ).toBe(40);
  });
});
