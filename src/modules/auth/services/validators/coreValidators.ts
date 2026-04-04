import type { FieldType, ValidatorFn } from "@modules/auth/types/schema.types";

export const isRequired = (
  message: string = "This field is required",
): ValidatorFn => {
  return (value) => {
    if (value === undefined || value === null) return message;
    if (typeof value === "string" && value.trim() === "") return message;
    if (typeof value === "boolean" && value === false) return message; // For checkboxes
    // If it's a File object, it's considered present and passes (null is caught above)
    return null;
  };
};

export const isEmailFormat = (
  message: string = "Invalid email format",
): ValidatorFn => {
  return (value) => {
    if (!value || typeof value !== "string") return null; // Let isRequired handle emptiness
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  };
};

export const isLengthChecked = (
  minLength?: {
    min: number;
    message?: string;
  },
  maxLength?: {
    max: number;
    message?: string;
  },
): ValidatorFn => {
  return (value) => {
    if (!value || typeof value !== "string") return null;
    if (minLength && value.length < minLength.min) {
      return (
        minLength.message || `Must be at least ${minLength.min} characters`
      );
    }
    if (maxLength && value.length > maxLength.max) {
      return maxLength.message || `Must be at most ${maxLength.max} characters`;
    }
    return null;
  };
};

export const isMatch = (targetValue: FieldType): ValidatorFn => {
  return (value, values) => {
    if (!value || typeof value !== "string") return null;
    if (value !== values[targetValue]) return "Passwords do not match";

    return null;
  };
};
