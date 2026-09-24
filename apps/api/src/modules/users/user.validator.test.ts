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

const bioMessages = (value: unknown) => {
  const result = updateMeSchema.safeParse({ bio: value });
  return result.success ? [] : result.error.issues.filter((i) => i.path[0] === "bio").map((i) => i.message);
};

describe("updateMeSchema — a name safe among other readers' words", () => {
  it("is stored in NFC", () => {
    expect(updateMeSchema.parse({ name: "Rene\u0301" }).name).toBe("René");
  });

  it("refuses a direction control, with one message", () => {
    expect(nameMessages("Ada\u202E")).toEqual(["Name cannot contain text-direction control characters"]);
  });

  it("refuses a name made only of invisible characters", () => {
    expect(nameMessages("\u200B")).toEqual(["Name is required"]);
  });

  it("counts length on the normalised name, so the limit protects what is stored", () => {
    expect(nameMessages("\u0958".repeat(25))).toEqual([]);
    expect(nameMessages("\u0958".repeat(26))).toEqual(["Name must be at most 50 characters"]);
  });
});

describe("updateMeSchema — bio", () => {
  it("is cleared by the empty string and by white space, as before", () => {
    expect(updateMeSchema.parse({ bio: "" }).bio).toBe("");
    expect(updateMeSchema.parse({ bio: "   " }).bio).toBe("");
  });

  it("is cleared, not refused, when it is made only of invisible characters", () => {
    expect(updateMeSchema.parse({ bio: "\u200B\u200D" }).bio).toBe("");
  });

  it("is stored in NFC, and refuses a direction control", () => {
    expect(updateMeSchema.parse({ bio: "cafe\u0301" }).bio).toBe("café");
    expect(bioMessages("hi\u2066")).toEqual(["Bio cannot contain text-direction control characters"]);
  });

  it("still refuses null, and counts length before trimming", () => {
    expect(bioMessages(null)).toHaveLength(1);
    expect(bioMessages("a".repeat(160))).toEqual([]);
    expect(bioMessages("a".repeat(161))).toEqual(["Bio must be at most 160 characters"]);
    expect(bioMessages(` ${"a".repeat(160)}`)).toEqual(["Bio must be at most 160 characters"]);
  });
});

describe("updateMeSchema — username is not text for readers", () => {
  it("keeps its own rule: refused for its characters, not by text safety", () => {
    const result = updateMeSchema.safeParse({ username: "ada\u202E" });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      "Username can only contain lowercase letters, numbers, and underscores",
    ]);
  });
});
