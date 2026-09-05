import { describe, expect, it } from "vitest";

import { advanceJourneySchema } from "./journey.validator.js";

const parse = (body: unknown) => advanceJourneySchema.safeParse(body);

const fieldsOf = (body: unknown) =>
  parse(body).error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("leaving the profile step", () => {
  it("takes how it was left", () => {
    expect(parse({ to: "verify", outcome: "skipped" })).toMatchObject({
      success: true,
      data: { to: "verify", outcome: "skipped" },
    });
  });

  it("is refused when it does not say", () => {
    expect(parse({ to: "verify" }).success).toBe(false);
    expect(fieldsOf({ to: "verify" })).toContain("outcome");
  });

  it("is refused when it says something the journey does not know", () => {
    expect(parse({ to: "verify", outcome: "abandoned" }).success).toBe(false);
  });
});

/**
 * A plain object strips what it does not recognise, so an outcome on these two
 * would be silently accepted and dropped rather than refused. The verification
 * step's outcome is derived from the capability that owns it, and a client that
 * could assert one would be a second source for a fact it does not hold.
 */
describe("every other move", () => {
  for (const to of ["code", "completed"] as const) {
    it(`carries no outcome to ${to}`, () => {
      expect(parse({ to })).toMatchObject({ success: true, data: { to } });
    });

    it(`refuses an outcome asserted for ${to}, rather than dropping it`, () => {
      expect(parse({ to, outcome: "saved" }).success).toBe(false);
      expect(fieldsOf({ to, outcome: "saved" })).toContain("outcome");
    });
  }
});

describe("an unknown target", () => {
  it("keeps the message the contract publishes", () => {
    const failure = parse({ to: "elsewhere" });

    expect(failure.success).toBe(false);
    expect(failure.error?.issues[0]?.message).toBe("Choose a step to move to.");
  });
});
