import type {
  FormFieldConfig,
  FieldValue,
  FormState,
  FormValue,
  FormPayload,
} from "../types/schema.types";

export const buildInitialFormState = <
  T extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: T,
): FormState<T> => {
  const initialValues: Record<string, FieldValue> = {};
  const initialErrors: Record<string, string | null> = {};

  for (const key in schema) {
    const type = schema[key].type;
    initialValues[key] =
      type === "checkbox" ? false : type === "file" ? null : "";
    initialErrors[key] = null;
  }
  return {
    values: initialValues as FormValue<T>,
    errors: initialErrors as Record<keyof T, string | null>,
    isSubmitting: false,
  };
};
