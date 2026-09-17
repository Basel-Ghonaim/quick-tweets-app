import type { FormFieldConfig } from "@shared/schema-form";
import {
  isLengthChecked,
  isMatch,
  isRequired,
  matchesPattern,
} from "@shared/schema-form";
import { emailRules, newPasswordPolicy } from "@shared/validation";
import { VALIDATION_MESSAGES } from "@shared/copy";
import { AUTH_COPY } from "@shared/copy";

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

const requestFields = {
  email: {
    name: "email",
    type: "email",
    label: AUTH_COPY.recovery.emailLabel,
    placeholder: AUTH_COPY.recovery.emailPlaceholder,
    span: "full",
    validators: [
      isRequired(VALIDATION_MESSAGES.required.email),
      matchesPattern(emailRules.format, VALIDATION_MESSAGES.emailFormat),
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
    label: AUTH_COPY.recovery.codeLabel,
    placeholder: AUTH_COPY.recovery.codePlaceholder,
    span: "full",
    validators: [isRequired(VALIDATION_MESSAGES.required.resetCode)],
  },
} satisfies Record<keyof RecoveryCodeValues, FormFieldConfig<RecoveryCodeValues>>;

// The same policy registration applies, read from one place — the server holds
// the new password to registration's own rules by reusing them too.
const passwordFields = {
  newPassword: {
    name: "newPassword",
    type: "password",
    label: AUTH_COPY.recovery.newPasswordLabel,
    placeholder: AUTH_COPY.recovery.newPasswordPlaceholder,
    span: "full",
    validators: [
      isRequired(VALIDATION_MESSAGES.required.password),
      isLengthChecked(
        VALIDATION_MESSAGES.minLength(newPasswordPolicy.minLength),
        VALIDATION_MESSAGES.maxLength(newPasswordPolicy.maxLength),
      ),
      matchesPattern(newPasswordPolicy.lowercase, VALIDATION_MESSAGES.passwordComplexity.lowercase),
      matchesPattern(newPasswordPolicy.uppercase, VALIDATION_MESSAGES.passwordComplexity.uppercase),
      matchesPattern(newPasswordPolicy.digit, VALIDATION_MESSAGES.passwordComplexity.digit),
      matchesPattern(newPasswordPolicy.special, VALIDATION_MESSAGES.passwordComplexity.special),
      matchesPattern(newPasswordPolicy.characters, VALIDATION_MESSAGES.passwordCharacters),
    ],
  },
  confirmPassword: {
    name: "confirmPassword",
    type: "password",
    label: AUTH_COPY.recovery.confirmPasswordLabel,
    placeholder: AUTH_COPY.recovery.confirmPasswordPlaceholder,
    span: "full",
    validators: [
      isRequired(VALIDATION_MESSAGES.required.confirmPassword),
      isMatch("newPassword", VALIDATION_MESSAGES.match.password),
    ],
  },
} satisfies Record<keyof RecoveryPasswordValues, FormFieldConfig<RecoveryPasswordValues>>;

export const recoveryFormSchemas = { requestFields, codeFields, passwordFields };
