import type { ReactNode } from "react";

/**
 * Props for the StandardInput variant.
 *
 * These are the values the parent FileInput passes down.
 * The variant owns its own state (displayName, validationError)
 * and handlers (handleFileChange, handleTriggerClick).
 */
export interface StandardInputProps {
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

  /** Accepted file types */
  accept?: string;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Allow multiple files */
  multiple: boolean;

  /** Whether the input is disabled */
  disabled: boolean;

  /** Whether the input has a validation error from parent */
  isInvalid: boolean;

  /** Error message from parent */
  errorMessage?: string;

  /** Helper text */
  helperText?: string;

  /** Color theme — already resolved into CSS variables */
  color: string;

  /** Custom trigger content */
  children?: ReactNode;

  /** Called when file(s) are selected */
  onChange?: (files: File | File[] | null) => void;

  /** Raw native change event for form engines */
  onNativeChange?: React.ChangeEventHandler<HTMLInputElement>;

  /** Callback to report internal validation errors to parent */
  onValidationError: (error: string) => void;
}
