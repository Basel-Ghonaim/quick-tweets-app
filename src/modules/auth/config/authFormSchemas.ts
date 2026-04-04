import type { FormFieldConfig } from "../types/schema.types";
import type { LoginCredentials, RegisterCredentials } from "../types";
import {
  isRequired,
  isEmailFormat,
  isLengthChecked,
} from "../services/validators";

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
      isRequired("Username is required"),
      isLengthChecked({ min: 4, message: "Must be at least 4 characters" }),
    ],
  },
  password: {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Min. 8 characters",
    validators: [
      isRequired("Password is required"),
      isLengthChecked(
        { min: 8, message: "Must be at least 8 characters" },
        { max: 16, message: "Must be at most 16 characters" },
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
    validators: [isRequired("Name is required")],
  },
  username: {
    name: "username",
    type: "text",
    label: "Username",
    placeholder: "johndoe",
    validators: [
      isRequired("Username is required"),
      isLengthChecked({ min: 4, message: "Must be at least 4 characters" }),
    ],
  },
  email: {
    name: "email",
    type: "email",
    label: "Email Address",
    placeholder: "you@company.com",
    validators: [isRequired("Email is required"), isEmailFormat()],
  },
  password: {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Min. 8 characters",
    validators: [
      isRequired("Password is required"),
      isLengthChecked(
        { min: 8, message: "Must be at least 8 characters" },
        { max: 16, message: "Must be at most 16 characters" },
      ),
    ],
  },
  confirmPassword: {
    name: "confirmPassword",
    type: "password",
    label: "Confirm Password",
    placeholder: "Repeat your password",
    validators: [isRequired("Please confirm your password")],
  },
  privacy: {
    name: "privacy",
    type: "checkbox",
    label: "I agree to the privacy policy rules",
    validators: [isRequired("You must accept the privacy policy")],
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
