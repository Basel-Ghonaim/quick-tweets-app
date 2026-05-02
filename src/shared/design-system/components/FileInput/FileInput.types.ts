import type { ReactNode } from "react";

// ─── Variant & Shape ────────────────────────────────────────────────────────

/** Determines which visual form the FileInput renders */
export type FileInputVariant = "standard" | "dropzone" | "avatar";

/** Avatar shape — only applies when variant="avatar" */
export type AvatarShape = "circle" | "rectangle";

/** Avatar background style — only applies when variant="avatar" */
export type AvatarFill = "default" | "outline";

// ─── File Item (for multi-file list in Phase 4) ─────────────────────────────

/** Status of an individual file in the list */
export type FileItemStatus = "idle" | "uploading" | "success" | "error";

/** Represents a single file entry with upload state */
export interface FileItem {
  id: string;
  file: File;
  preview?: string;
  status: FileItemStatus;
  progress: number;
  error?: string;
}

// ─── Color ──────────────────────────────────────────────────────────────────

export type FileInputColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";

// ─── Component Props ────────────────────────────────────────────────────────

export interface FileInputProps {
  /** Field name — required for form integration */
  name: string;

  /** Label rendered above the input */
  label?: string;

  // ── Variant ──

  /** Visual variant of the file input */
  variant?: FileInputVariant;

  /** Avatar shape — only used when variant="avatar" */
  avatarShape?: AvatarShape;

  /** Avatar background style — only used when variant="avatar" */
  avatarFill?: AvatarFill;

  // ── Value (controlled) ──

  /** Current file(s) value — controlled by parent */
  value?: File | File[] | null;

  /** Called when file(s) are selected or dropped */
  onChange?: (files: File | File[] | null) => void;

  /** Raw native change event — used by form engines that read e.target.files */
  onNativeChange?: React.ChangeEventHandler<HTMLInputElement>;

  /** Called when a file is removed from the list */
  onRemove?: (file: File) => void;

  // ── Restrictions ──

  /** Accepted file types (e.g. "image/*", ".pdf,.doc") */
  accept?: string;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Allow selecting multiple files */
  multiple?: boolean;

  /** Maximum number of files allowed (only when multiple=true) */
  maxFiles?: number;

  /** Minimum number of files required (only when multiple=true) */
  minFiles?: number;

  // ── States ──

  /** Marks the input as invalid */
  isInvalid?: boolean;

  /** Error message shown below the input when isInvalid is true */
  errorMessage?: string;

  /** Disables the input */
  disabled?: boolean;

  /** Helper text shown below the input (e.g. "PNG, JPG up to 5MB") */
  helperText?: string;

  // ── Style ──

  /** Color theme */
  color?: FileInputColor;

  /** Stretches the input to fill its container */
  fullWidth?: boolean;

  /** Additional CSS class */
  className?: string;

  /** Custom trigger content — replaces the default button in Standard variant */
  children?: ReactNode;
}
