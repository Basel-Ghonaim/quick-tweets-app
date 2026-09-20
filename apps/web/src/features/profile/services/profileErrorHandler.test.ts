import { describe, expect, it } from "vitest";
import { createAppError } from "@shared/errors";
import { CATALOGUES } from "@shared/copy";
import { profileErrorHandler } from "./profileErrorHandler";

const words = CATALOGUES.en.auth.profile;

describe("profile's wording", () => {
  it("says what a rejected field means in its own words", () => {
    expect(profileErrorHandler(createAppError("validation", "raw"), words).message).toBe(
      words.invalid,
    );
  });

  it("says a lapsed session is a lapsed session, not a wrong password", () => {
    expect(profileErrorHandler(createAppError("unauthorized", "raw"), words).message).toBe(
      words.sessionExpired,
    );
  });

  it("says nothing about a conflict, which this screen cannot cause", () => {
    const refusal = createAppError("conflict", "raw");

    expect(profileErrorHandler(refusal, words)).toBe(refusal);
  });
});
