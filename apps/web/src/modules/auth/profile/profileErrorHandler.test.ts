import { describe, expect, it } from "vitest";
import { createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";
import { profileErrorHandler } from "./profileErrorHandler";

describe("profile's wording", () => {
  it("says what a rejected field means in its own words", () => {
    expect(profileErrorHandler(createAppError("validation", "raw")).message).toBe(
      AUTH_COPY.profile.invalid,
    );
  });

  it("says a lapsed session is a lapsed session, not a wrong password", () => {
    expect(profileErrorHandler(createAppError("unauthorized", "raw")).message).toBe(
      AUTH_COPY.profile.sessionExpired,
    );
  });

  it("says nothing about a conflict, which this screen cannot cause", () => {
    const refusal = createAppError("conflict", "raw");

    expect(profileErrorHandler(refusal)).toBe(refusal);
  });
});
