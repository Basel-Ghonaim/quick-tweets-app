import type { FormChangeHandler, FieldType } from "@shared/schema-form";

export interface SchemaFieldProps {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  value: unknown;
  error: string | null;
  onChange: FormChangeHandler;
}
