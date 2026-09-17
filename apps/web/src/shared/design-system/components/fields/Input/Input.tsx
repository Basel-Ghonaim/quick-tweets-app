import { forwardRef, useState } from "react";
import styles from "./Input.module.css";
import type { InputProps } from "./Input.types";
import { PasswordToggle } from "./parts/PasswordToggle";
import { classNames, customProperties, useFieldA11y } from "../../shared";
import { FieldLabel, FieldMessages } from "../anatomy";
import { Spinner } from "../../feedback/Spinner";

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
      revealLabel,
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

    // The affordances the field composes itself. Nothing displaces anything:
    // not a caller's `suffix`, and not each other — a loading password field
    // keeps the means of revealing its value. The toggle is ordered first so
    // that it does not move when the indicator arrives, and it stays mounted so
    // that the visibility it owns cannot reset underneath the type this field
    // derives from it.
    const ownedSuffix = (
      <>
        {isPassword && (
          <PasswordToggle
            label={revealLabel ?? ""}
            controlId={controlId}
            disabled={disabled}
            className={styles.passwordToggle}
            onToggle={setIsPasswordVisible}
          />
        )}
        {isLoading && <Spinner />}
      </>
    );

    const hasSuffix = Boolean(suffix) || isPassword || isLoading;

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
        <FieldLabel htmlFor={controlId}>{label}</FieldLabel>

        <div className={styles.control}>
          {prefix && <span className={styles.adornment}>{prefix}</span>}

          <input
            ref={ref}
            id={controlId}
            type={isPassword && isPasswordVisible ? "text" : type}
            className={styles.input}
            disabled={disabled}
            aria-busy={isLoading || undefined}
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

        <FieldMessages
          helperId={helperId}
          errorId={errorId}
          helperText={helperText}
          errorMessage={errorMessage}
          showError={showError}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
