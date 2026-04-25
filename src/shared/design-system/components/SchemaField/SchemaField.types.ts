import type { FormChangeHandler, FieldType, FieldSpan } from "@shared/schema-form";

export interface SchemaFieldProps {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  value: unknown;
  error: string | null;
  onChange: FormChangeHandler;
  span?: FieldSpan;
}
