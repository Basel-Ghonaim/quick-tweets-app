import { AUTH_COPY } from "./auth";
import { CONTROL_COPY } from "./controls";
import { ERROR_COPY } from "./errors";
import { PLACEHOLDER_COPY } from "./placeholder";
import { VALIDATION_MESSAGES } from "./validation";

/** English, the source language: every other catalogue is written in the shape of this one. */
export const ENGLISH = {
  auth: AUTH_COPY,
  controls: CONTROL_COPY,
  errors: ERROR_COPY,
  placeholder: PLACEHOLDER_COPY,
  validation: VALIDATION_MESSAGES,
} as const;
