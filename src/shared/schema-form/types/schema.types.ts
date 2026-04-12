import { type ChangeEvent } from "react";

export type FieldType =
  | "text"
  | "password"
  | "email"
  | "checkbox"
  | "radio"
  | "file"
  | "file-multiple"
  | "number"
  | "select"
  | "textarea";

export type FieldValue<T extends FieldType = FieldType> = T extends
  | "checkbox"
  | "radio"
  ? boolean
  : T extends "file"
    ? File | null
    : T extends "file-multiple"
      ? File[] | null
      : T extends "number"
        ? number | ""
        : string;

export type FormPayload = Record<string, unknown>;

export type ValidatorFn = (
  value: FieldValue,
  values: FormPayload,
) => string | null;

export interface FormFieldConfig<TPayload> {
  name: keyof TPayload;
  type: FieldType;
  label: string;
  placeholder?: string;
  validators?: ValidatorFn[];
}

export type FormValue<T extends Record<string, FormFieldConfig<FormPayload>>> =
  {
    [K in keyof T]: FieldValue<T[K]["type"]>;
  };

export interface FormState<
  T extends Record<string, FormFieldConfig<FormPayload>>,
> {
  values: FormValue<T>;
  errors: Record<keyof T, string | null>;
  isSubmitting: boolean;
}

export type FormChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

export type FormChangeHandler = (e: FormChangeEvent) => void;
export type FormSubmitHandler = (e: SubmitEvent) => Promise<void>;
