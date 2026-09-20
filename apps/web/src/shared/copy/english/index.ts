import { AUTH_COPY } from "./auth";
import { CONTROL_COPY } from "./controls";
import { ERROR_COPY } from "./errors";
import { PLACEHOLDER_COPY } from "./placeholder";
import { RECOVERY_COPY } from "./recovery";
import { VALIDATION_MESSAGES } from "./validation";

/**
 * English, the source language: every other catalogue is written in the shape of this one.
 *
 * Four rules keep these lines translatable, and none of them is visible from a value: a key
 * addresses a whole line rather than a fragment, a varying value takes named values through a
 * function rather than concatenation, no markup travels with text, and a value reads as a line
 * so it can be reflowed.
 */
export const ENGLISH = {
  auth: AUTH_COPY,
  controls: CONTROL_COPY,
  errors: ERROR_COPY,
  placeholder: PLACEHOLDER_COPY,
  recovery: RECOVERY_COPY,
  validation: VALIDATION_MESSAGES,
} as const;
