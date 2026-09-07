import type {
  FormFieldConfig,
  FieldValue,
  FormState,
  FormValue,
  FormPayload,
  FieldType,
} from "../types/schema.types";

const getInitialValue = (type: FieldType): FieldValue => {
  switch (type) {
    case "checkbox":
      return false;
    case "number":
      return "";
    case "file":
    case "file-multiple":
      return null;
    default:
      return "";
  }
};

export const buildInitialFormState = <
  T extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: T,
  seed?: Partial<FormValue<T>>,
): FormState<T> => {
  const initialValues: Record<string, FieldValue> = {};
  const initialErrors: Record<string, string | null> = {};

  for (const key in schema) {
    const type = schema[key].type;
    const given = seed?.[key];
    initialValues[key] = given === undefined ? getInitialValue(type) : (given as FieldValue);
    initialErrors[key] = null;
  }
  return {
    values: initialValues as FormValue<T>,
    errors: initialErrors as Record<keyof T, string | null>,
    isSubmitting: false,
  };
};
