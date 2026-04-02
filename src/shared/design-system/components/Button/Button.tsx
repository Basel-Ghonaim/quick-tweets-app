import React, { forwardRef } from "react";
import styles from "./Button.module.css";
import type { ButtonProps } from "./Button.types";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "contained",
      state = "idle",
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
      "--btn-bg": `var(--color-${color}-primary)`,
      "--btn-bg-hover": `var(--color-${color}-secondary)`,
      "--btn-border": `var(--color-${color}-primary)`,
      "--btn-text":
        variant === "contained"
          ? "#ffffff"
          : `var(--color-${color}-primary)`,
      "--btn-bg-alpha": `var(--color-${color}-alpha)`,
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
