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

const nameMessages = (value: unknown) => {
  const result = updateMeSchema.safeParse({ name: value });
  return result.success ? [] : result.error.issues.filter((i) => i.path[0] === "name").map((i) => i.message);
};

describe("updateMeSchema — a name must have something in it", () => {
  it("refuses white space alone rather than storing an empty name", () => {
    for (const blank of ["   ", "\t\n", "\u00A0\u00A0"]) {
      expect(nameMessages(blank)).toEqual(["Name is required"]);
    }
  });

  it("still refuses the empty string, and still clears with null", () => {
    expect(nameMessages("")).toEqual(["Name is required"]);
    expect(updateMeSchema.parse({ name: null }).name).toBeNull();
  });

  it("stores a padded name trimmed", () => {
    expect(updateMeSchema.parse({ name: "  Ada  " }).name).toBe("Ada");
  });

  it("counts length before trimming, as it always has", () => {
    expect(nameMessages("a".repeat(50))).toEqual([]);
    expect(nameMessages("a".repeat(51))).toEqual(["Name must be at most 50 characters"]);
    expect(nameMessages(` ${"a".repeat(50)} `)).toEqual(["Name must be at most 50 characters"]);
  });
});
