import { forwardRef } from "react";
import styles from "./Button.module.css";
import type { ButtonProps } from "./Button.types";
import { classNames, customProperties } from "../../shared";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "contained",
      color = "primary",
      size = "medium",
      isLoading = false,
      isInvalid,
      fullWidth = false,
      leftIcon,
      rightIcon,
      loadingText,
      className,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    const dynamicStyles = customProperties(
      {
        "--button-bg": `var(--role-fill-${color})`,
        "--button-bg-hover": `var(--role-fill-${color}-hover)`,
        "--button-border": `var(--role-fill-${color})`,
        "--button-text":
          variant === "contained"
            ? `var(--role-fill-${color}-text)`
            : `var(--role-on-surface-${color})`,
        "--button-bg-alpha": `var(--role-fill-${color}-subtle)`,
      },
      style,
    );

    return (
      <button
        ref={ref}
        className={classNames(
          styles.root,
          styles[`variant-${variant}`],
          styles[`size-${size}`],
          isLoading && styles.isLoading,
          fullWidth && styles.fullWidth,
          className,
        )}
        style={dynamicStyles}
        // A loading button is unavailable for the same reason a disabled one is,
        // so the state is expressed once on the element rather than mirrored
        // into a prop the caller also controls.
        disabled={disabled || isLoading}
        aria-invalid={isInvalid || undefined}
        {...props}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {!isLoading && leftIcon && (
          <span className={styles.icon}>{leftIcon}</span>
        )}

        <span>{isLoading && loadingText ? loadingText : children}</span>

        {!isLoading && rightIcon && (
          <span className={styles.icon}>{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
