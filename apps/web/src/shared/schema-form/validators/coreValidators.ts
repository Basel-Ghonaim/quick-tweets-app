import type { FormPayload, ValidatorFn } from "../types/schema.types";

// Every factory takes the message it reports: the engine holds no words, and a
// default would be one language no caller is made to replace.

export const isRequired = (message: string): ValidatorFn => {
  return (value) => {
    if (value === undefined || value === null) return message;
    if (typeof value === "string" && value.trim() === "") return message;
    if (typeof value === "boolean" && value === false) return message;
    return null;
  };
};

export const isLengthChecked = (
  minLength?: {
    min: number;
    message: string;
  },
  maxLength?: {
    max: number;
    message: string;
  },
): ValidatorFn => {
  return (value) => {
    if (!value || typeof value !== "string") return null;
    if (minLength && value.length < minLength.min) {
      return minLength.message;
    }
    if (maxLength && value.length > maxLength.max) {
      return maxLength.message;
    }
    return null;
  };
};

export const isMatch = <T extends FormPayload>(
  targetField: keyof T & string,
  message: string,
): ValidatorFn => {
  return (value, values) => {
    // Nothing to compare until this field itself has a value — presence is
    // `isRequired`'s job. Guarding on the *target* instead (the previous
    // `if (!target)`) masked a real mismatch whenever the target was still empty.
    if (value === null || value === undefined || value === "") return null;
    return value !== values[targetField] ? message : null;
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
  message: string,
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
