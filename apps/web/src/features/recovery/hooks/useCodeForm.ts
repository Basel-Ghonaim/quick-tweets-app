import { normaliseCode } from "@shared/one-time-code";
import { recoveryFormSchemas } from "../forms";
import { useRecoveryForm } from "./useRecoveryForm";

export const useCodeForm = (onSubmit: (code: string) => Promise<void>) =>
  useRecoveryForm(recoveryFormSchemas.codeFields, ({ code }) =>
    // Normalised before it travels: the server normalises nothing and answers
    // every rejection alike, so a lowercase code would look like a wrong one.
    onSubmit(normaliseCode(code)),
  );
