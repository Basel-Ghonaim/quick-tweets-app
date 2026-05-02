import type { AvatarShape, AvatarFill } from "../FileInput.types";

/**
 * Shared props interface for all FileInput variants.
 *
 * Every variant (Standard, Dropzone, Avatar) receives these
 * props from the parent FileInput shell. Variant-specific
 * props extend this interface.
 */
export interface BaseVariantProps {
  /** Ref forwarded to the hidden native input */
  inputRef: React.RefObject<HTMLInputElement | null>;

  /** Generated ID for label-input linking */
  generatedId: string;

  /** Error ID for aria-describedby */
  errorId: string;

  /** Helper ID for aria-describedby */
  helperId: string;

  /** Field name for form integration */
  name: string;

  /** Accepted file types (e.g. "image/*", ".pdf,.doc") */
  accept?: string;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Allow multiple files */
  multiple: boolean;

  /** Maximum number of files allowed (only when multiple=true) */
  maxFiles?: number;

  /** Minimum number of files required (only when multiple=true) */
  minFiles?: number;

  /** Whether the input is disabled */
  disabled: boolean;

  /** Avatar shape — circle or rectangle (only for avatar variant) */
  avatarShape: AvatarShape;

  /** Avatar background style — default or outline (only for avatar variant) */
  avatarFill: AvatarFill;

  /** Whether the input has a validation error from parent */
  isInvalid: boolean;

  /** Error message from parent */
  errorMessage?: string;

  /** Helper text */
  helperText?: string;

  /** Color theme — resolved into CSS variables at runtime */
  color: string;

  /** Called when file(s) are selected or dropped */
  onChange?: (files: File | File[] | null) => void;

  /** Raw native change event for form engines */
  onNativeChange?: React.ChangeEventHandler<HTMLInputElement>;

  /** Callback to report internal validation errors to parent */
  onValidationError: (error: string) => void;
}
