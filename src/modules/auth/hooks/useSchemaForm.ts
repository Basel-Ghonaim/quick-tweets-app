import { useState } from "react";
import type {
  FormFieldConfig,
  FieldValue,
  FormState,
  FormValue,
} from "../types/schema.types";

// Service function to analyze the entire schema and build the pure initial state
const buildInitialFormState = <
  T extends Record<string, FormFieldConfig<Record<string, FieldValue>>>,
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

export const useSchemaForm = <
  TSchema extends Record<string, FormFieldConfig<Record<string, FieldValue>>>,
>(
  schema: TSchema,
  onSubmitAction: (values: FormValue<TSchema>) => Promise<void>,
) => {
  const [state, setState] = useState<FormState<TSchema>>(() =>
    buildInitialFormState(schema),
  );
  return {
    ...state,
  };
};
