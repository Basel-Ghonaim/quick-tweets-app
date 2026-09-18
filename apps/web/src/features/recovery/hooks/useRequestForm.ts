import { useMemo } from "react";
import { toFieldEntries } from "@shared/schema-form";
import { useRecoverySchemas } from "./useRecoverySchemas";
import { useRecoveryForm } from "./useRecoveryForm";

export const useRequestForm = (
  onSubmit: (email: string) => Promise<void>,
  initialEmail?: string,
) => {
  const { requestFields } = useRecoverySchemas();
  const fields = useMemo(() => toFieldEntries(requestFields), [requestFields]);
  const form = useRecoveryForm(
    requestFields,
    ({ email }) => onSubmit(email),
    initialEmail ? { email: initialEmail } : undefined,
  );

  return { fields, ...form };
};
