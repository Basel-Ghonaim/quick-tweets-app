import type { ReactNode } from "react";
import type { FieldProps, NativeProps } from "../../shared";

export type AvatarShape = "circle" | "rectangle";
export type AvatarFill = "default" | "outline";
export type AvatarBorder = "dashed" | "solid" | "none";

/**
 * What every file control accepts, whichever variant renders it.
 *
 * `type` is omitted because the component fixes it, and `isLoading` because a
 * file control's busy state belongs to the upload the consumer performs, not to
 * the selection this component owns.
 */
interface FileInputBase
  extends Omit<NativeProps<"input">, "type">,
    Omit<FieldProps, "isLoading"> {
  /** Required: a file control that is not named cannot participate in a form. */
  name: string;
  /** Rejection threshold in bytes, applied before a file enters the selection. */
  maxSize?: number;
  fullWidth?: boolean;
  /** Reports the selection whenever it changes. Empty when nothing is selected. */
  onFilesChange?: (files: File[]) => void;
}

interface StandardFileInput extends FileInputBase {
  variant?: "standard";
  /** Replaces the default trigger. */
  children?: ReactNode;
}

interface DropzoneFileInput extends FileInputBase {
  variant: "dropzone";
  maxFiles?: number;
  minFiles?: number;
}

/** Single by construction, so `multiple` is not merely ignored — it is absent. */
interface AvatarFileInput extends Omit<FileInputBase, "multiple"> {
  variant: "avatar";
  avatarShape?: AvatarShape;
  avatarFill?: AvatarFill;
  avatarBorder?: AvatarBorder;
  avatarSize?: number;
}

/**
 * Discriminated on `variant`, so a variant's own props cannot be passed with
 * another. The previous shape was the union of all three variants' needs, which
 * meant every variant received props it ignored and no combination was invalid.
 */
export type FileInputProps =
  | StandardFileInput
  | DropzoneFileInput
  | AvatarFileInput;
