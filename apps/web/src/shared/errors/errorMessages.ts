import type { ErrorMessages, ErrorType } from "./types";

/* The pipeline decides which type a failure is and never how it is worded: the
   words are content, read from the composition root's resolver as each failure happens. */
let resolveMessages: (() => ErrorMessages) | null = null;

export const setupErrorMessages = (resolve: () => ErrorMessages): void => {
  resolveMessages = resolve;
};

/** A type's default wording, or the type's own name while none has been supplied. */
export const defaultMessageFor = (type: ErrorType): string => resolveMessages?.()[type] ?? type;
