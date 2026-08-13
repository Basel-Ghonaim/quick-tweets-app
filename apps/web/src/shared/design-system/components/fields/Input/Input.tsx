import { forwardRef, useState } from "react";
import styles from "./Input.module.css";
import type { InputProps } from "./Input.types";
import { PasswordToggle } from "./parts/PasswordToggle";
import { classNames, customProperties, useFieldA11y } from "../../shared";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "outlined",
      color = "primary",
      size = "medium",
      isInvalid = false,
      isLoading = false,
      fullWidth = false,
      prefix,
      suffix,
      label,
      errorMessage,
      helperText,
      className,
      style,
      disabled,
      id,
      type,
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

    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = type === "password";

    // The affordances the field composes itself. A caller's `suffix` sits
    // alongside them rather than replacing them, so supplying one can never
    // remove the means of revealing a password or the busy indicator.
    const ownedSuffix = isLoading ? (
      <span className={styles.spinner} aria-hidden="true" />
    ) : isPassword ? (
      <PasswordToggle
        controlId={controlId}
        disabled={disabled}
        className={styles.passwordToggle}
        onToggle={setIsPasswordVisible}
      />
    ) : null;

    const hasSuffix = Boolean(suffix) || ownedSuffix !== null;

    return (
      <div
        className={classNames(
          styles.root,
          styles[`variant-${variant}`],
          styles[`size-${size}`],
          fullWidth && styles.fullWidth,
          isInvalid && styles.isInvalid,
          disabled && styles.isDisabled,
          Boolean(prefix) && styles.hasPrefix,
          hasSuffix && styles.hasSuffix,
          className,
        )}
        style={customProperties(
          { "--input-border-focus": `var(--role-fill-${color})` },
          style,
        )}
      >
        {label && (
          <label className={styles.label} htmlFor={controlId}>
            {label}
          </label>
        )}

        <div className={styles.control}>
          {prefix && <span className={styles.adornment}>{prefix}</span>}

          <input
            ref={ref}
            id={controlId}
            type={isPassword && isPasswordVisible ? "text" : type}
            className={styles.input}
            disabled={disabled}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            {...props}
          />

          {hasSuffix && (
            <span className={styles.adornment}>
              {ownedSuffix}
              {suffix}
            </span>
          )}
        </div>

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

Input.displayName = "Input";
