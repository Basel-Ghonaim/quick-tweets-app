import type {
  FormChangeHandler,
  FieldType,
  FieldSpan,
} from "../../types/schema.types";

export interface SchemaFieldProps {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  value: unknown;
  error: string | null;
  onChange: FormChangeHandler;
  span?: FieldSpan;
  autoFocus?: boolean;
}
