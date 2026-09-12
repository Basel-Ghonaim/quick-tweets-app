import { toFieldEntries } from "@shared/schema-form";
import { recoveryFormSchemas } from "../forms";
import { useRecoveryForm } from "./useRecoveryForm";

const fields = toFieldEntries(recoveryFormSchemas.requestFields);

export const useRequestForm = (
  onSubmit: (email: string) => Promise<void>,
  initialEmail?: string,
) => {
  const form = useRecoveryForm(
    recoveryFormSchemas.requestFields,
    ({ email }) => onSubmit(email),
    initialEmail ? { email: initialEmail } : undefined,
  );

  return { fields, ...form };
};
