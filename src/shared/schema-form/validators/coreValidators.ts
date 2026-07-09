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

/**
 * The value must match `pattern`; empty / non-string values pass (compose with
 * `isRequired` for presence).
 *
 * Normalizes away the `g`/`y` flags once: a global or sticky regex keeps a mutable
 * `lastIndex` between `.test()` calls, so reusing it would make repeated
 * validations return alternating results — and the copy avoids mutating the
 * caller's regex.
 */
export const matchesPattern = (
  pattern: RegExp,
  message: string = "Invalid format",
): ValidatorFn => {
  const stateless =
    pattern.global || pattern.sticky
      ? new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""))
      : pattern;
  return (value) => {
    if (!value || typeof value !== "string") return null;
    return stateless.test(value) ? null : message;
  };
};
