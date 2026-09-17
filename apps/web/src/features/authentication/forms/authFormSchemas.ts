import type { FormFieldConfig } from "@shared/schema-form";
import type { LoginCredentials, RegisterCredentials } from "../model";
import {
  isRequired,
  isLengthChecked,
  isMatch,
  matchesPattern,
} from "@shared/schema-form";
import { AUTH_COPY, VALIDATION_MESSAGES } from "@shared/copy";
import { emailRules, newPasswordPolicy, usernameRules } from "@shared/validation";

// ─── Login: identity check only ──────────────────────────────────────────────
// Presence only — login checks an existing credential and must not apply the
// account-creation policy (matches the backend loginSchema).
const loginFields = {
  identifier: {
    name: "identifier",
    type: "text",
    label: AUTH_COPY.signIn.identifierLabel,
    placeholder: AUTH_COPY.signIn.identifierPlaceholder,
    validators: [isRequired(VALIDATION_MESSAGES.required.identifier)],
  },
  password: {
    name: "password",
    type: "password",
    label: AUTH_COPY.signIn.passwordLabel,
    placeholder: AUTH_COPY.signIn.passwordPlaceholder,
    validators: [isRequired(VALIDATION_MESSAGES.required.password)],
  },
} satisfies Record<keyof LoginCredentials, FormFieldConfig<LoginCredentials>>;

// ─── Register: full field rules + the New Password Policy ─────────────────────
// Deliberately not built from loginFields — that coupling is how the stale
// max(16) leaked into login. The backend re-validates independently.
const registerFields = {
  username: {
    name: "username",
    type: "text",
    label: AUTH_COPY.signUp.usernameLabel,
    placeholder: AUTH_COPY.signUp.usernamePlaceholder,
    validators: [
      isRequired(VALIDATION_MESSAGES.required.username),
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
    label: AUTH_COPY.signUp.passwordLabel,
    placeholder: AUTH_COPY.signUp.passwordPlaceholder,
    validators: [
      isRequired(VALIDATION_MESSAGES.required.password),
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
      matchesPattern(
        newPasswordPolicy.characters,
        VALIDATION_MESSAGES.passwordCharacters,
      ),
    ],
  },
  email: {
    name: "email",
    type: "email",
    label: AUTH_COPY.signUp.emailLabel,
    placeholder: AUTH_COPY.signUp.emailPlaceholder,
    validators: [
      isRequired(VALIDATION_MESSAGES.required.email),
      matchesPattern(emailRules.format, VALIDATION_MESSAGES.emailFormat),
    ],
  },
  confirmPassword: {
    name: "confirmPassword",
    type: "password",
    label: AUTH_COPY.signUp.confirmPasswordLabel,
    placeholder: AUTH_COPY.signUp.confirmPasswordPlaceholder,
    validators: [
      isRequired(VALIDATION_MESSAGES.required.confirmPassword),
      isMatch("password", VALIDATION_MESSAGES.match.password),
    ],
  },
} satisfies Record<
  keyof RegisterCredentials,
  FormFieldConfig<RegisterCredentials>
>;

export const authFormSchemas = {
  loginFields,
  // Registration is account creation only (auth-first, ADR 0008) — no avatar.
  registerFields: {
    username: { ...registerFields.username, span: "full" },
    email: { ...registerFields.email, span: "full" },
    password: { ...registerFields.password, span: "full" },
    confirmPassword: { ...registerFields.confirmPassword, span: "full" },
  } satisfies Record<string, FormFieldConfig<RegisterCredentials>>,
};
