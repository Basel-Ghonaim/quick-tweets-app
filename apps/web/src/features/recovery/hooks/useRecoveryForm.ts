import { useCallback, useState } from "react";
import { errorNormalizer, type SerializedAppError } from "@shared/errors";
import {
  useSchemaForm,
  type FormFieldConfig,
  type FormPayload,
  type FormValue,
} from "@shared/schema-form";
import { useCopy } from "@shared/copy";
import { recoveryErrorHandler } from "../services";

/**
 * The three screens meet the same two refusals in the same way, so the wiring
 * is here rather than written out three times.
 */
export const useRecoveryForm = <TSchema extends Record<string, FormFieldConfig<FormPayload>>>(
  schema: TSchema,
  action: (values: FormValue<TSchema>) => Promise<void>,
  initialValues?: Partial<FormValue<TSchema>>,
) => {
  const [serverError, setServerError] = useState<SerializedAppError | null>(null);
  const copy = useCopy();

  const submit = useCallback(
    async (values: FormValue<TSchema>) => {
      setServerError(null);
      await action(values);
    },
    [action],
  );

  const onError = useCallback(
    (error: unknown) => {
      setServerError(recoveryErrorHandler(errorNormalizer(error), copy.recovery).toSerialized());
    },
    [copy],
  );

  const form = useSchemaForm(schema, submit, onError, initialValues);

  return { ...form, serverError };
};
