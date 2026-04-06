export type FieldType = "text" | "password" | "email" | "checkbox" | "file";
export type FieldValue<T extends FieldType = FieldType> = T extends "checkbox"
  ? boolean
  : T extends "file"
    ? File | null
    : string;

export type ValidatorFn = (
  value: FieldValue,
  values: Record<string, FieldValue>,
) => string | null;

export interface FormFieldConfig<TPayload> {
  name: keyof TPayload;
  type: FieldType;
  label: string;
  placeholder?: string;
  validators?: ValidatorFn[];
}

export type FormValue<
  T extends Record<string, FormFieldConfig<Record<string, FieldValue>>>,
> = {
  [K in keyof T]: FieldValue<T[K]["type"]>;
};

export interface FormState<
  T extends Record<string, FormFieldConfig<Record<string, FieldValue>>>,
> {
  values: FormValue<T>;
  errors: Record<keyof T, string | null>;
  isSubmitting: boolean;
}
