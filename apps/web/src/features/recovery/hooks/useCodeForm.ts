import { normaliseCode } from "@shared/one-time-code";
import { useRecoverySchemas } from "./useRecoverySchemas";
import { useRecoveryForm } from "./useRecoveryForm";

export const useCodeForm = (onSubmit: (code: string) => Promise<void>) =>
  useRecoveryForm(useRecoverySchemas().codeFields, ({ code }) =>
    // Normalised before it travels: the server normalises nothing and answers
    // every rejection alike, so a lowercase code would look like a wrong one.
    onSubmit(normaliseCode(code)),
  );
