import type { FormPayload, ValidatorFn } from "../types/schema.types";

export const isRequired = (
  message: string = "This field is required",
): ValidatorFn => {
  return (value) => {
    if (value === undefined || value === null) return message;
    if (typeof value === "string" && value.trim() === "") return message;
    if (typeof value === "boolean" && value === false) return message;
    return null;
  };
};

export const isEmailFormat = (
  message: string = "Invalid email format",
): ValidatorFn => {
  return (value) => {
    if (!value || typeof value !== "string") return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(value) ? null : message;
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

export const isMatch = <T extends FormPayload>(
  targetField: keyof T & string,
  message: string = "Fields do not match",
): ValidatorFn => {
  return (value, values) => {
    const target = values[targetField];
    if (!target) return null;
    return value !== target ? message : null;
  };
};
