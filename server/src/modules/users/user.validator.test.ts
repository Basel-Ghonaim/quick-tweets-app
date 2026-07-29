import { describe, expect, it } from "vitest";

import { updateMeSchema } from "./user.validator";

// name is optional profile data: omitted = unchanged, null = clear, string = set.
describe("updateMeSchema — name", () => {
  it("accepts name: null (clear)", () => {
    expect(updateMeSchema.safeParse({ name: null }).success).toBe(true);
  });

  it("accepts a string name (set)", () => {
    expect(updateMeSchema.safeParse({ name: "Ada" }).success).toBe(true);
  });

  it("rejects an empty patch (at least one field required)", () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });
});
