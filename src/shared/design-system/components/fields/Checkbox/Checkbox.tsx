import { forwardRef } from "react";
import styles from "./Checkbox.module.css";
import type { CheckboxProps } from "./Checkbox.types";
import { classNames, customProperties, useFieldA11y } from "../../shared";
import { CheckIcon } from "../../../icons";

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      color = "primary",
      size = "medium",
      isInvalid = false,
      errorMessage,
      helperText,
      className,
      style,
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const { controlId, errorId, helperId, showError, describedBy } = useFieldA11y({
      id,
      isInvalid,
      errorMessage,
      helperText,
    });

    const dynamicStyles = customProperties(
      {
        "--checkbox-color": `var(--role-fill-${color})`,
        "--checkbox-text": `var(--role-fill-${color}-text)`,
      },
      style,
    );

    return (
      <div
        className={classNames(
          styles.root,
          styles[`size-${size}`],
          isInvalid && styles.isInvalid,
          disabled && styles.isDisabled,
          className,
        )}
      >
        <label className={styles.row} htmlFor={controlId}>
          {/* Visually replaced, never removed: the real control stays focusable
              and is what assistive technology reads. */}
          <input
            ref={ref}
            id={controlId}
            type="checkbox"
            className={styles.nativeInput}
            disabled={disabled}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            {...props}
          />

          <span style={dynamicStyles} className={styles.box}>
            <span className={styles.icon}>
              <CheckIcon />
            </span>
          </span>

          <span className={styles.label}>{label}</span>
        </label>

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
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
