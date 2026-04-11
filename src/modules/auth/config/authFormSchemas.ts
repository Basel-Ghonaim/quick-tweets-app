import type { FormFieldConfig } from "../../../shared/schema-form/types/schema.types";
import type { LoginCredentials, RegisterCredentials } from "../types";
import {
  isRequired,
  isEmailFormat,
  isLengthChecked,
  isMatch,
} from "@shared/schema-form";
import { VALIDATION_MESSAGES } from "./validationMessages";

const loginFields = {
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
} satisfies Record<keyof LoginCredentials, FormFieldConfig<LoginCredentials>>;

const registerFields = {
  name: {
    name: "name",
    type: "text",
    label: "Full Name",
    placeholder: "John Doe",
    validators: [isRequired(VALIDATION_MESSAGES.required("Name"))],
  },
  ...loginFields,
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
  profileImage: {
    name: "profileImage",
    type: "file",
    label: "Profile Image",
    placeholder: "Upload your profile image",
    validators: [],
  },
} satisfies Record<
  keyof RegisterCredentials,
  FormFieldConfig<RegisterCredentials>
>;

export const authFormSchemas = {
  loginFields,
  registerFields,
};
