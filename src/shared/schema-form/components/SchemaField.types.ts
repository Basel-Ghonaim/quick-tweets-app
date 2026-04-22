import type { FormChangeHandler } from "../types/schema.types";
import type { FieldType } from "../types/schema.types";

export interface SchemaFieldProps {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  value: unknown;
  error: string | null;
  onChange: FormChangeHandler;
}
