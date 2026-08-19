import { forwardRef } from "react";
import styles from "./IconButton.module.css";
import type { IconButtonProps } from "./IconButton.types";
import { classNames, customProperties } from "../../shared";
import { Spinner } from "../../feedback/Spinner";

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = "ghost",
      color,
      shape = "rounded",
      size = "medium",
      isLoading = false,
      isInvalid,
      className,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    // Only bound when a role is asked for; every rule falls back to the
    // surrounding text, which is what an uncoloured action inherits.
    const dynamicStyles = customProperties(
      color
        ? {
            "--icon-button-fill": `var(--role-fill-${color})`,
            "--icon-button-fill-hover": `var(--role-fill-${color}-hover)`,
            "--icon-button-on-fill": `var(--role-fill-${color}-text)`,
            "--icon-button-on-surface": `var(--role-on-surface-${color})`,
            "--icon-button-subtle": `var(--role-fill-${color}-subtle)`,
          }
        : {},
      style,
    );

    return (
      <button
        ref={ref}
        // Defaulted because an icon action is rarely a submit, and every
        // hand-rolled one in the layer already sets it.
        type="button"
        className={classNames(
          styles.root,
          styles[`variant-${variant}`],
          styles[`shape-${shape}`],
          styles[`size-${size}`],
          isLoading && styles.isLoading,
          className,
        )}
        style={dynamicStyles}
        // A loading control is unavailable for the same reason a disabled one
        // is, so the state is expressed once on the element.
        disabled={disabled || isLoading}
        aria-invalid={isInvalid || undefined}
        {...props}
      >
        {isLoading ? <Spinner /> : <span className={styles.icon}>{icon}</span>}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
