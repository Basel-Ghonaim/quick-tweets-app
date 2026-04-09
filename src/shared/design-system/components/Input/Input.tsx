import React, { forwardRef } from "react";
import styles from "./Input.module.css";
import type { InputProps } from "./Input.types";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "outlined",
      color = "primary",
      inputSize = "medium",
      isInvalid = false,
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = "",
      style,
      label,
      disabled,
      ...props
    },
    ref,
  ) => {
    const containerClasses = [
      styles.container,
      styles[`variant-${variant}`],
      styles[`size-${inputSize}`],
      fullWidth ? styles.fullWidth : "",
      isInvalid ? styles.isInvalid : "",
      disabled ? styles.isDisabled : "",
      leftIcon ? styles.hasLeftIcon : "",
      rightIcon || isLoading ? styles.hasRightIcon : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const dynamicStyles = {
      "--input-border-focus": `var(--color-${color}-primary)`,
      "--input-border-alpha": `var(--color-${color}-alpha)`,
      ...style,
    } as React.CSSProperties;

    return (
      <div className={containerClasses} style={dynamicStyles}>
        {label && <div className={styles.label}>{label}</div>}
        <div className={styles.wrapper}>
          {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
          <input
            ref={ref}
            className={styles.input}
            disabled={disabled} 
            aria-invalid={isInvalid}
            {...props}
          />

          {isLoading ? (
            <span className={styles.icon}>
              <span className={styles.spinner} aria-hidden="true" />
            </span>
          ) : rightIcon ? (
            <span className={styles.icon}>{rightIcon}</span>
          ) : null}
        </div>
      </div>
    );
  },
);

Input.displayName = "Input";
