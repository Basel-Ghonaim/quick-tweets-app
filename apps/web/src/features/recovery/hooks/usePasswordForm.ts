import { useMemo } from "react";
import { toFieldEntries } from "@shared/schema-form";
import { useRecoverySchemas } from "./useRecoverySchemas";
import { useRecoveryForm } from "./useRecoveryForm";

export const usePasswordForm = (onSubmit: (newPassword: string) => Promise<void>) => {
  const { passwordFields } = useRecoverySchemas();
  const fields = useMemo(() => toFieldEntries(passwordFields), [passwordFields]);
  const form = useRecoveryForm(passwordFields, ({ newPassword }) => onSubmit(newPassword));

  return { fields, ...form };
};
