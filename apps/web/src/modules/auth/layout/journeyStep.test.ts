import { describe, expect, it } from "vitest";
import { stepSegment } from "./stepSegment";

describe("the segment a journey step owns", () => {
  it("is the one after auth, for every step that has no nesting", () => {
    expect(stepSegment("/auth/signup")).toBe("signup");
    expect(stepSegment("/auth/profile")).toBe("profile");
    expect(stepSegment("/auth/verify")).toBe("verify");
  });

  it("stays the step's own when the step nests a route beneath it", () => {
    expect(stepSegment("/auth/verify/code")).toBe("verify");
  });

  it("survives a trailing slash and a query, which a location carries", () => {
    expect(stepSegment("/auth/verify/")).toBe("verify");
  });

  it("names nothing outside the journey", () => {
    expect(stepSegment("/auth")).toBe("");
    expect(stepSegment("/feed")).toBe("");
  });
});
