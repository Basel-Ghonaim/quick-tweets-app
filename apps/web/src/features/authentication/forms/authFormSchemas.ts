import type { FormFieldConfig } from "@shared/schema-form";
import type { LoginCredentials, RegisterCredentials } from "../model";
import {
  isRequired,
  isLengthChecked,
  isMatch,
  matchesPattern,
} from "@shared/schema-form";
import type { Catalogue } from "@shared/copy";
import { emailRules, newPasswordPolicy, usernameRules } from "@shared/validation";

/** Built from the active catalogue, so every label and message is in the reader's language. */
export const authFormSchemas = (copy: Catalogue) => {
  // ─── Login: identity check only ──────────────────────────────────────────────
  // Presence only — login checks an existing credential and must not apply the
  // account-creation policy (matches the backend loginSchema).
  const loginFields = {
    identifier: {
      name: "identifier",
      type: "text",
      dir: "ltr",
      label: copy.auth.signIn.identifierLabel,
      placeholder: copy.auth.signIn.identifierPlaceholder,
      validators: [isRequired(copy.validation.required.identifier)],
    },
    password: {
      name: "password",
      type: "password",
      label: copy.auth.signIn.passwordLabel,
      placeholder: copy.auth.signIn.passwordPlaceholder,
      validators: [isRequired(copy.validation.required.password)],
    },
  } satisfies Record<keyof LoginCredentials, FormFieldConfig<LoginCredentials>>;

  // ─── Register: full field rules + the New Password Policy ─────────────────────
  // Deliberately not built from loginFields — that coupling is how the stale
  // max(16) leaked into login. The backend re-validates independently.
  const registerFields = {
    username: {
      name: "username",
      type: "text",
      dir: "ltr",
      label: copy.auth.signUp.usernameLabel,
      placeholder: copy.auth.signUp.usernamePlaceholder,
      validators: [
        isRequired(copy.validation.required.username),
        isLengthChecked(
          copy.validation.minLength(usernameRules.minLength),
          copy.validation.maxLength(usernameRules.maxLength),
        ),
        matchesPattern(usernameRules.charset, copy.validation.usernameCharset),
      ],
    },
    password: {
      name: "password",
      type: "password",
      label: copy.auth.signUp.passwordLabel,
      placeholder: copy.auth.signUp.passwordPlaceholder,
      validators: [
        isRequired(copy.validation.required.password),
        isLengthChecked(
          copy.validation.minLength(newPasswordPolicy.minLength),
          copy.validation.maxLength(newPasswordPolicy.maxLength),
        ),
        matchesPattern(
          newPasswordPolicy.lowercase,
          copy.validation.passwordComplexity.lowercase,
        ),
        matchesPattern(
          newPasswordPolicy.uppercase,
          copy.validation.passwordComplexity.uppercase,
        ),
        matchesPattern(
          newPasswordPolicy.digit,
          copy.validation.passwordComplexity.digit,
        ),
        matchesPattern(
          newPasswordPolicy.special,
          copy.validation.passwordComplexity.special,
        ),
        matchesPattern(
          newPasswordPolicy.characters,
          copy.validation.passwordCharacters,
        ),
      ],
    },
    email: {
      name: "email",
      type: "email",
      label: copy.auth.signUp.emailLabel,
      placeholder: copy.auth.signUp.emailPlaceholder,
      validators: [
        isRequired(copy.validation.required.email),
        matchesPattern(emailRules.format, copy.validation.emailFormat),
      ],
    },
    confirmPassword: {
      name: "confirmPassword",
      type: "password",
      label: copy.auth.signUp.confirmPasswordLabel,
      placeholder: copy.auth.signUp.confirmPasswordPlaceholder,
      validators: [
        isRequired(copy.validation.required.confirmPassword),
        isMatch("password", copy.validation.match.password),
      ],
    },
  } satisfies Record<
    keyof RegisterCredentials,
    FormFieldConfig<RegisterCredentials>
  >;

  return {
    loginFields,
    // Registration is account creation only (auth-first, ADR 0008) — no avatar.
    registerFields: {
      username: { ...registerFields.username, span: "full" },
      email: { ...registerFields.email, span: "full" },
      password: { ...registerFields.password, span: "full" },
      confirmPassword: { ...registerFields.confirmPassword, span: "full" },
    } satisfies Record<string, FormFieldConfig<RegisterCredentials>>,
  };
};
