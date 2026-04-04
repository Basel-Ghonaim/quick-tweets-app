import type { FormFieldConfig } from "../types/schema.types";
import type { LoginCredentials, RegisterCredentials } from "../types";
import {
  isRequired,
  isEmailFormat,
  isLengthChecked,
  isMatch,
} from "../services/validators";
import { VALIDATION_MESSAGES } from "./validationMessages";

const loginFields: Record<
  keyof LoginCredentials,
  FormFieldConfig<LoginCredentials>
> = {
  username: {
    name: "username",
    type: "text",
    label: "Username",
    placeholder: "johndoe",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Username")),
      isLengthChecked(
        VALIDATION_MESSAGES.minLength(4),
        VALIDATION_MESSAGES.maxLength(20),
      ),
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
        VALIDATION_MESSAGES.minLength(8),
        VALIDATION_MESSAGES.maxLength(16),
      ),
    ],
  },
} as const;

const registerFields: Record<
  keyof RegisterCredentials,
  FormFieldConfig<RegisterCredentials>
> = {
  name: {
    name: "name",
    type: "text",
    label: "Full Name",
    placeholder: "John Doe",
    validators: [isRequired(VALIDATION_MESSAGES.required("Name"))],
  },
  username: {
    name: "username",
    type: "text",
    label: "Username",
    placeholder: "johndoe",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Username")),
      isLengthChecked(
        VALIDATION_MESSAGES.minLength(4),
        VALIDATION_MESSAGES.maxLength(20),
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
  password: {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Min. 8 characters",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Password")),
      isLengthChecked(
        VALIDATION_MESSAGES.minLength(8),
        VALIDATION_MESSAGES.maxLength(16),
      ),
    ],
  },
  confirmPassword: {
    name: "confirmPassword",
    type: "password",
    label: "Confirm Password",
    placeholder: "Repeat your password",
    validators: [
      isRequired(VALIDATION_MESSAGES.required("Confirm Password")),
      isMatch("password"),
    ],
  },
  privacy: {
    name: "privacy",
    type: "checkbox",
    label: "I agree to the privacy policy rules",
    validators: [isRequired(VALIDATION_MESSAGES.privacy)],
  },
  profileImage: {
    name: "profileImage",
    type: "file",
    label: "Profile Image",
    placeholder: "Upload your profile image",
    validators: [],
  },
} as const;

export const authFormSchemas = {
  loginFields,
  registerFields,
};
