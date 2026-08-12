import type {
  FormFieldConfig,
  FormPayload,
  FormValue,
} from "../types/schema.types";
import { executeFieldValidators } from "./executeFieldValidators";

export const validateSchemaForm = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
  values: FormValue<TSchema>,
) => {
  let isValid = true;
  const newErrors = {} as Record<keyof TSchema, string | null>;

  for (const key in schema) {
    const fieldName = key as Extract<keyof TSchema, string>;
    const validators = schema[fieldName].validators;
    const fieldError = executeFieldValidators(
      values[fieldName],
      values as FormPayload,
      validators,
    );

    if (fieldError) isValid = false;
    newErrors[fieldName] = fieldError;
  }

  return { isValid, errors: newErrors };
};
