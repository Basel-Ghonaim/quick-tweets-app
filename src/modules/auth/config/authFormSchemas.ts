import type { FormFieldConfig } from "@shared/schema-form";
import type { LoginCredentials, RegisterCredentials } from "../types";
import {
  isRequired,
  isEmailFormat,
  isLengthChecked,
  isMatch,
  matchesPattern,
} from "@shared/schema-form";
import { VALIDATION_MESSAGES } from "./validationMessages";
import { newPasswordPolicy, usernameRules, nameRules } from "./authValidationRules";

// ─── Login: identity check only ──────────────────────────────────────────────
// Presence only — login checks an existing credential and must not apply the
// account-creation policy (matches the backend loginSchema).
const loginFields = {
  identifier: {
    name: "identifier",
    type: "text",
    label: "Username or email",
    placeholder: "johndoe or you@company.com",
    validators: [isRequired(VALIDATION_MESSAGES.required("Username or email"))],
  },
  password: {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Your password",
    validators: [isRequired(VALIDATION_MESSAGES.required("Password"))],
  },
} satisfies Record<keyof LoginCredentials, FormFieldConfig<LoginCredentials>>;

// ─── Register: full field rules + the New Password Policy ─────────────────────
// Deliberately not built from loginFields — that coupling is how the stale
// max(16) leaked into login. The backend re-validates independently.
const registerFields = {
  name: {
    name: "name",
    type: "text",
    label: "Full Name",
    placeholder: "John Doe",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Name")),
      isLengthChecked(
        undefined,
        VALIDATION_MESSAGES.maxLength(nameRules.maxLength),
      ),
    ],
  },
  username: {
    name: "username",
    type: "text",
    label: "Username",
    placeholder: "johndoe",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Username")),
      isLengthChecked(
        VALIDATION_MESSAGES.minLength(usernameRules.minLength),
        VALIDATION_MESSAGES.maxLength(usernameRules.maxLength),
      ),
      matchesPattern(usernameRules.charset, VALIDATION_MESSAGES.usernameCharset),
    ],
  },
  password: {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Min. 8 characters",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Password")),
      isLengthChecked(
        VALIDATION_MESSAGES.minLength(newPasswordPolicy.minLength),
        VALIDATION_MESSAGES.maxLength(newPasswordPolicy.maxLength),
      ),
      matchesPattern(
        newPasswordPolicy.lowercase,
        VALIDATION_MESSAGES.passwordComplexity.lowercase,
      ),
      matchesPattern(
        newPasswordPolicy.uppercase,
        VALIDATION_MESSAGES.passwordComplexity.uppercase,
      ),
      matchesPattern(
        newPasswordPolicy.digit,
        VALIDATION_MESSAGES.passwordComplexity.digit,
      ),
      matchesPattern(
        newPasswordPolicy.special,
        VALIDATION_MESSAGES.passwordComplexity.special,
      ),
    ],
  },
  email: {
    name: "email",
    type: "email",
    label: "Email Address",
    placeholder: "you@company.com",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Email")),
      isEmailFormat(),
    ],
  },
  confirmPassword: {
    name: "confirmPassword",
    type: "password",
    label: "Confirm Password",
    placeholder: "Repeat your password",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Confirm Password")),
      isMatch("password", VALIDATION_MESSAGES.match("Password")),
    ],
  },
  privacy: {
    name: "privacy",
    type: "checkbox",
    label: "I agree to the privacy policy rules",
    validators: [isRequired(VALIDATION_MESSAGES.privacy)],
  },
} satisfies Record<
  keyof RegisterCredentials,
  FormFieldConfig<RegisterCredentials>
>;

export const authFormSchemas = {
  loginFields,
  // Registration is account creation only (auth-first, ADR 0008) — no avatar.
  registerFields: {
    name: { ...registerFields.name, span: "half" },
    username: { ...registerFields.username, span: "half" },
    email: { ...registerFields.email, span: "full" },
    password: { ...registerFields.password, span: "half" },
    confirmPassword: { ...registerFields.confirmPassword, span: "half" },
    privacy: { ...registerFields.privacy, span: "full" },
  } satisfies Record<string, FormFieldConfig<RegisterCredentials>>,
};
