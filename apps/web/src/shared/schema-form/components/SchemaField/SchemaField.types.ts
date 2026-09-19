import type {
  AvatarFileInputContent,
  StandardFileInputContent,
} from "@shared/design-system";
import type {
  FormChangeHandler,
  FormFieldConfig,
  FormPayload,
  FieldType,
  FieldSpan,
} from "../../types/schema.types";

/** The words of the controls a field composes itself, which the engine holds none of. */
export interface SchemaFieldControls {
  /** The name of a password field's reveal toggle. */
  revealPassword: string;
  /** The single-file control a `file` field renders. */
  file: AvatarFileInputContent;
  /** The multi-file control a `file-multiple` field renders. */
  files: StandardFileInputContent;
}

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
  dir?: FormFieldConfig<FormPayload>["dir"];
  controls: SchemaFieldControls;
}
