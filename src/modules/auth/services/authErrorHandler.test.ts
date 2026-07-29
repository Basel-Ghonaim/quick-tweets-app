// authErrorHandler — auth-specific, form-level messages; field errors pass through.
import { describe, it, expect } from "vitest";
import { createAppError } from "@shared/errors";

import { authErrorHandler } from "./authErrorHandler";

describe("authErrorHandler", () => {
  it("maps unauthorized to a credentials message without naming a field", () => {
    const mapped = authErrorHandler(createAppError("unauthorized", "Invalid credentials"));

    expect(mapped.type).toBe("unauthorized");
    expect(mapped.message).toBe("Incorrect username/email or password.");
    expect(mapped.errors).toBeUndefined(); // form-level: carries no field map
  });

  it("keeps field errors when overriding a validation message", () => {
    const mapped = authErrorHandler(
      createAppError("validation", "Validation failed", { password: ["too short"] }),
    );

    expect(mapped.message).toBe("Please review the highlighted fields to correct the errors.");
    expect(mapped.errors).toEqual({ password: ["too short"] });
  });

  it("passes through a type with no auth-specific message", () => {
    const original = createAppError("server", "boom");
    expect(authErrorHandler(original)).toBe(original);
  });
});
