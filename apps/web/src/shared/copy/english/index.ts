import { AUTH } from "./auth";
import { CONTROLS } from "./controls";
import { ERRORS } from "./errors";
import { PLACEHOLDER } from "./placeholder";
import { RECOVERY } from "./recovery";
import { VALIDATION } from "./validation";

/**
 * English, the source language: every other catalogue is written in the shape of this one.
 *
 * Four rules keep these lines translatable, and none of them is visible from a value: a key
 * addresses a whole line rather than a fragment, a varying value takes named values through a
 * function rather than concatenation, no markup travels with text, and a value reads as a line
 * so it can be reflowed.
 */
export const ENGLISH = {
  auth: AUTH,
  controls: CONTROLS,
  errors: ERRORS,
  placeholder: PLACEHOLDER,
  recovery: RECOVERY,
  validation: VALIDATION,
} as const;
