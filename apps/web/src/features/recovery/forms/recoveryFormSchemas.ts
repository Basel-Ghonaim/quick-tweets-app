import type { FormFieldConfig } from "@shared/schema-form";
import {
  isLengthChecked,
  isMatch,
  isRequired,
  matchesPattern,
} from "@shared/schema-form";
import { emailRules, newPasswordPolicy } from "@shared/validation";
import type { Catalogue } from "@shared/copy";

export interface RecoveryRequestValues {
  email: string;
}

export interface RecoveryCodeValues {
  code: string;
}

export interface RecoveryPasswordValues {
  newPassword: string;
  confirmPassword: string;
}

/** Built from the active catalogue, so every label and message is in the reader's language. */
export const recoveryFormSchemas = (copy: Catalogue) => {
  const requestFields = {
    email: {
      name: "email",
      type: "email",
      label: copy.auth.recovery.emailLabel,
      placeholder: copy.auth.recovery.emailPlaceholder,
      span: "full",
      validators: [
        isRequired(copy.validation.required.email),
        matchesPattern(emailRules.format, copy.validation.emailFormat),
      ],
    },
  } satisfies Record<keyof RecoveryRequestValues, FormFieldConfig<RecoveryRequestValues>>;

  /**
   * Presence only. The code's shape is the server's to judge, and rejecting a
   * malformed one here would tell a caller something a wrong one does not.
   */
  const codeFields = {
    code: {
      name: "code",
      type: "text",
      label: copy.auth.recovery.codeLabel,
      placeholder: copy.auth.recovery.codePlaceholder,
      span: "full",
      validators: [isRequired(copy.validation.required.resetCode)],
    },
  } satisfies Record<keyof RecoveryCodeValues, FormFieldConfig<RecoveryCodeValues>>;

  // The same policy registration applies, read from one place — the server holds
  // the new password to registration's own rules by reusing them too.
  const passwordFields = {
    newPassword: {
      name: "newPassword",
      type: "password",
      label: copy.auth.recovery.newPasswordLabel,
      placeholder: copy.auth.recovery.newPasswordPlaceholder,
      span: "full",
      validators: [
        isRequired(copy.validation.required.password),
        isLengthChecked(
          copy.validation.minLength(newPasswordPolicy.minLength),
          copy.validation.maxLength(newPasswordPolicy.maxLength),
        ),
        matchesPattern(newPasswordPolicy.lowercase, copy.validation.passwordComplexity.lowercase),
        matchesPattern(newPasswordPolicy.uppercase, copy.validation.passwordComplexity.uppercase),
        matchesPattern(newPasswordPolicy.digit, copy.validation.passwordComplexity.digit),
        matchesPattern(newPasswordPolicy.special, copy.validation.passwordComplexity.special),
        matchesPattern(newPasswordPolicy.characters, copy.validation.passwordCharacters),
      ],
    },
    confirmPassword: {
      name: "confirmPassword",
      type: "password",
      label: copy.auth.recovery.confirmPasswordLabel,
      placeholder: copy.auth.recovery.confirmPasswordPlaceholder,
      span: "full",
      validators: [
        isRequired(copy.validation.required.confirmPassword),
        isMatch("newPassword", copy.validation.match.password),
      ],
    },
  } satisfies Record<keyof RecoveryPasswordValues, FormFieldConfig<RecoveryPasswordValues>>;

  return { requestFields, codeFields, passwordFields };
};
