import React, { forwardRef } from "react";
import styles from "./Button.module.css";
import type { ButtonProps } from "./Button.types";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "contained",
      state = "active",
      color = "primary",
      size = "medium",
      fullWidth = false,
      leftIcon,
      rightIcon,
      loadingText,
      className = "",
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    const classNames = [
      styles.button,
      styles[`variant-${variant}`],
      styles[`size-${size}`],
      styles[`state-${state}`],
      fullWidth ? styles.fullWidth : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const dynamicStyles = {
      "--btn-bg": `var(--color-${color}-primary, #3b82f6)`,
      "--btn-bg-hover": `var(--color-${color}-secondary, #2563eb)`,
      "--btn-border": `var(--color-${color}-primary, #3b82f6)`,
      "--btn-text":
        variant === "contained"
          ? "#ffffff"
          : `var(--color-${color}-primary, #3b82f6)`,
      "--btn-bg-alpha": `var(--color-${color}-alpha, rgba(59, 130, 246, 0.1))`,
      ...style,
    } as React.CSSProperties;

    const isLoading = state === "loading";
    const isButtonDisabled = disabled || state === "disabled" || isLoading;

    return (
      <button
        ref={ref}
        className={classNames}
        style={dynamicStyles}
        disabled={isButtonDisabled}
        aria-disabled={isButtonDisabled}
        {...props}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {!isLoading && leftIcon && (
          <span className={styles.icon}>{leftIcon}</span>
        )}

        {isLoading && loadingText ? (
          <span>{loadingText}</span>
        ) : (
          <span>{children}</span>
        )}

        {!isLoading && rightIcon && (
          <span className={styles.icon}>{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
