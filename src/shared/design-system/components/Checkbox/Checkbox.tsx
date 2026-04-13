import { forwardRef, useId } from "react";
import styles from "./Checkbox.module.css";
import type { CheckboxProps } from "./Checkbox.types";

const CheckIcon = () => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      color = "primary",
      checkboxSize = "medium",
      isInvalid = false,
      errorMessage,
      className = "",
      disabled,
      id: externalId,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    const containerClasses = [
      styles.container,
      styles[`size-${checkboxSize}`],
      isInvalid ? styles.isInvalid : "",
      disabled ? styles.isDisabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const dynamicStyles = {
      "--checkbox-color": `var(--color-${color}-primary)`,
      "--checkbox-alpha": `var(--color-${color}-alpha)`,
    } as React.CSSProperties;

    return (  
      <div className={containerClasses}>
        <label className={styles.row} htmlFor={id}>
          {/* Native input hidden but fully accessible */}
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={styles.nativeInput}
            disabled={disabled}
            aria-invalid={isInvalid}
            {...props}
          />

          {/* Custom visual box */}
          <span style={dynamicStyles} className={styles.box}>
            <span className={styles.icon}>
              <CheckIcon />
            </span>
          </span>

          {/* Label text */}
          <span className={styles.label}>{label}</span>
        </label>

        {isInvalid && errorMessage && (
          <span className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
