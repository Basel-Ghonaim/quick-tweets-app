import styles from "./Field.module.css";

interface FieldLabelProps {
  /** The control this names. */
  htmlFor: string;
  children?: string;
}

/**
 * The label above a control.
 *
 * Not every field is shaped this way: a Checkbox's label wraps its control
 * rather than preceding it, so it composes the messages below and keeps its own
 * label. Extracting a shape that fits three and bending the fourth into it is
 * how a shared part starts encoding one case's assumptions.
 *
 * A component rather than a stylesheet consumers import, because a shared
 * stylesheet is scoped to its own directory by the class-reference check — the
 * references would either fail there or, imported under another name, stop
 * being checked at all.
 */
export const FieldLabel = ({ htmlFor, children }: FieldLabelProps) =>
  children ? (
    <label className={styles.label} htmlFor={htmlFor}>
      {children}
    </label>
  ) : null;
