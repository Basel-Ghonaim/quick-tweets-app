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
      "--btn-bg": `var(--control-fill-${color})`,
      "--btn-bg-hover": `var(--control-fill-${color}-hover)`,
      "--btn-border": `var(--control-fill-${color})`,
      "--btn-text":
        variant === "contained"
          ? `var(--control-fill-${color}-text)`
          : `var(--control-on-surface-${color})`,
      "--btn-bg-alpha": `var(--control-fill-${color}-subtle)`,
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
