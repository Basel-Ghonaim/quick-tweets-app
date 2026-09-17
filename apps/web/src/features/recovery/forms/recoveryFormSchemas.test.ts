import { describe, expect, it } from "vitest";
import { VALIDATION_MESSAGES } from "@shared/copy";
import type { ValidatorFn } from "@shared/schema-form";
import { recoveryFormSchemas } from "./recoveryFormSchemas";

/** What a field shows for a value: its first failing validator's message, as the engine reports it. */
const shownFor = (field: { validators?: ValidatorFn[] }, value: string) =>
  (field.validators ?? []).map((validate) => validate(value, {})).find(Boolean) ?? null;

describe("recovery's fields compose the credential rules", () => {
  it("refuses a new password outside printable ASCII with the catalogue's message", () => {
    expect(shownFor(recoveryFormSchemas.passwordFields.newPassword, "Passw0rd!\u0643\u0644\u0645\u0629")).toBe(
      VALIDATION_MESSAGES.passwordCharacters,
    );
  });
});
