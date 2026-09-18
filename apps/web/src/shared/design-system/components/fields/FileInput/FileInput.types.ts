import type { ReactNode } from "react";
import type { FieldProps, NativeProps } from "../../shared";

export type AvatarShape = "circle" | "rectangle";
export type AvatarFill = "default" | "outline";
export type AvatarBorder = "dashed" | "solid" | "none";

/** Why a chosen file was refused, and how a size is written. `limit` arrives written by `size`. */
export interface FileSelectionContent {
  notAccepted: (fileName: string) => string;
  tooLarge: (fileName: string, limit: string) => string;
  /** A byte count as the reader's language writes it, with its unit. */
  size: (bytes: number) => string;
}

/** Every word the standard control shows; it checks size but not type. */
export interface StandardFileInputContent extends Pick<FileSelectionContent, "tooLarge" | "size"> {
  choose: string;
  nothingChosen: string;
  chosenCount: (count: number) => string;
}

/** Every word the avatar control shows. */
export interface AvatarFileInputContent extends FileSelectionContent {
  /** The empty prompt under the `default` fill. */
  upload: string;
  /** The empty prompt under the `outline` fill. */
  uploadCompact: string;
  remove: string;
  removeTitle: string;
  replace: string;
  replaceTitle: string;
}

/** Every word the dropzone shows, in both its image and its file mode. */
export interface DropzoneFileInputContent extends FileSelectionContent {
  dragFiles: string;
  dragImages: string;
  dropFiles: string;
  dropImages: string;
  browse: string;
  remove: (fileName: string) => string;
  addMoreFiles: string;
  replaceFile: string;
  addMoreImages: string;
  addMore: string;
  tooMany: (max: number) => string;
  tooFew: (min: number) => string;
}

/**
 * What every file control accepts, whichever variant renders it.
 *
 * `type` is omitted because the component fixes it, `content` because the native attribute
 * means nothing on an input, and `isLoading` because a file control's busy state belongs to
 * the upload the consumer performs, not to the selection this component owns.
 */
interface FileInputBase
  extends Omit<NativeProps<"input">, "type" | "content">,
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
  /** The words it shows; the layer holds none of its own. */
  content: StandardFileInputContent;
  /** Replaces the default trigger. */
  children?: ReactNode;
}

interface DropzoneFileInput extends FileInputBase {
  variant: "dropzone";
  content: DropzoneFileInputContent;
  maxFiles?: number;
  minFiles?: number;
}

/** Single by construction, so `multiple` is not merely ignored — it is absent. */
interface AvatarFileInput extends Omit<FileInputBase, "multiple"> {
  variant: "avatar";
  content: AvatarFileInputContent;
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
