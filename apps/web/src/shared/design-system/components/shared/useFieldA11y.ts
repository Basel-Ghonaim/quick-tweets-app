import { useId } from "react";

interface FieldA11yInput {
  /** A caller-supplied id; one is generated when absent. */
  id?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  helperText?: string;
}

interface FieldA11y {
  controlId: string;
  errorId: string;
  helperId: string;
  /** Whether the error is both present and applicable. */
  showError: boolean;
  /** For `aria-describedby` — `undefined` rather than `""` so the attribute is omitted. */
  describedBy: string | undefined;
}

/**
 * Derives a field's identifiers and its description wiring.
 *
 * Shared because each component derived them differently and one associated no
 * error with its control at all — an omission invisible to everything except a
 * screen reader. Deriving the ids and the `aria-describedby` list together is
 * what makes that association structural instead of remembered.
 */
export const useFieldA11y = ({
  id,
  isInvalid = false,
  errorMessage,
  helperText,
}: FieldA11yInput): FieldA11y => {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = `${controlId}-error`;
  const helperId = `${controlId}-helper`;

  const showError = isInvalid && Boolean(errorMessage);
  const describedBy =
    [showError && errorId, Boolean(helperText) && helperId]
      .filter(Boolean)
      .join(" ") || undefined;

  return { controlId, errorId, helperId, showError, describedBy };
};
