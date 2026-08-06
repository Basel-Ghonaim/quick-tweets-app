import type { Role } from "../../../foundations";

/**
 * What the shell hands every variant: the identity of the hidden input, the
 * constraints applied before a file is accepted, and the channels a variant
 * reports through.
 *
 * It carries no message text and no message ids. Each variant used to receive
 * the error and helper strings with their ids purely to re-derive the same
 * `aria-describedby` value, three times over. The shell derives it once and
 * passes the result.
 */
export interface VariantContext {
  inputRef: React.RefObject<HTMLInputElement | null>;
  controlId: string;
  /** Already composed by the shell; a variant applies it, never builds it. */
  describedBy?: string;
  name: string;
  accept?: string;
  maxSize?: number;
  disabled: boolean;
  isInvalid: boolean;
  color: Role;
  /** The parsed selection. */
  onFilesChange?: (files: File[]) => void;
  /** The platform's own handler, forwarded to the hidden input. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** A constraint the variant itself enforced; the shell decides how to show it. */
  onValidationError: (error: string) => void;
}
