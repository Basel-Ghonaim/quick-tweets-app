import styles from "./Field.module.css";

interface FieldMessagesProps {
  helperId: string;
  errorId: string;
  helperText?: string;
  errorMessage?: string;
  /** Whether the error is both present and applicable — `useFieldA11y` decides. */
  showError: boolean;
}

/**
 * A field's description and its error.
 *
 * Composed by every field, including the one whose label is shaped differently,
 * because what a field says below its control is the half they all agree on.
 * The ids arrive already derived, so this renders the association rather than
 * inventing it.
 */
export const FieldMessages = ({
  helperId,
  errorId,
  helperText,
  errorMessage,
  showError,
}: FieldMessagesProps) => (
  <>
    {helperText && (
      <span id={helperId} className={styles.helperText}>
        {helperText}
      </span>
    )}

    {showError && (
      <span id={errorId} className={styles.errorMessage} role="alert">
        {errorMessage}
      </span>
    )}
  </>
);
