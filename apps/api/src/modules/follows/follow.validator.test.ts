import { describe, expect, it } from "vitest";

import { suggestionsQuerySchema } from "./follow.validator";

describe("suggestionsQuerySchema — a bounded list", () => {
  it("asks for three when no limit is given, as the sidebar does", () => {
    expect(suggestionsQuerySchema.parse({}).limit).toBe(3);
  });

  it("accepts up to twenty, as Show more does", () => {
    expect(suggestionsQuerySchema.parse({ limit: "20" }).limit).toBe(20);
  });

  it("refuses a limit outside one to twenty, or not a whole number", () => {
    for (const limit of ["0", "21", "2.5", "many"]) {
      expect(suggestionsQuerySchema.safeParse({ limit }).success).toBe(false);
    }
  });

  it("takes the person to leave out by handle, trimmed", () => {
    expect(suggestionsQuerySchema.parse({ exclude: "  ada  " }).exclude).toBe("ada");
    expect(suggestionsQuerySchema.safeParse({ exclude: "   " }).success).toBe(false);
  });
});
