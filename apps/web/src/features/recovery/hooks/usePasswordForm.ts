import { toFieldEntries } from "@shared/schema-form";
import { recoveryFormSchemas } from "../forms";
import { useRecoveryForm } from "./useRecoveryForm";

const fields = toFieldEntries(recoveryFormSchemas.passwordFields);

export const usePasswordForm = (onSubmit: (newPassword: string) => Promise<void>) => {
  const form = useRecoveryForm(recoveryFormSchemas.passwordFields, ({ newPassword }) =>
    onSubmit(newPassword),
  );

  return { fields, ...form };
};
