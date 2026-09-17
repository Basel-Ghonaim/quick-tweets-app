import type { ErrorMessages, ErrorType } from "./types";

/* The pipeline decides which type a failure is and never how it is worded: the
   words are content, handed in at the composition root. */
let messages: ErrorMessages | null = null;

export const setupErrorMessages = (next: ErrorMessages): void => {
  messages = next;
};

/** A type's default wording, or the type's own name while none has been supplied. */
export const defaultMessageFor = (type: ErrorType): string => messages?.[type] ?? type;
