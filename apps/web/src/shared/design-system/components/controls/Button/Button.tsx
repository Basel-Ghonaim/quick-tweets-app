import { forwardRef, type ElementType } from "react";
import styles from "./Button.module.css";
import type { ButtonProps } from "./Button.types";
import { classNames, customProperties } from "../../shared";
import { Spinner } from "../../feedback/Spinner";
import { navigatingElement } from "../../navigation/navigationElement";

// The action is the common arm, so its element types the ref; a destination
// takes the same ref and is the narrower case.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "contained",
      color = "primary",
      size = "medium",
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const { href, isLoading = false, loadingText, disabled, ...props } =
      rest as Partial<{
        href: string;
        isLoading: boolean;
        loadingText: string;
        disabled: boolean;
      }> &
        Record<string, unknown>;

    // A destination renders with whatever the application registered; an action
    // is a button. The appearance below does not know which it got.
    const navigates = href !== undefined;
    const Element = (navigates ? navigatingElement() : "button") as ElementType;

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
      <Element
        ref={ref}
        href={href}
        // Defaulted because a button in a form submits it otherwise, and a
        // submit is a decision the caller makes rather than one it inherits.
        // A destination submits nothing, so it carries no type at all.
        type={navigates ? undefined : "button"}
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
        // so it takes the native attribute rather than a prop the caller also
        // controls -- and `aria-busy` says which of the two it is, which
        // `disabled` alone cannot.
        disabled={navigates ? undefined : disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Spinner />}
        {!isLoading && leftIcon && (
          <span className={styles.icon}>{leftIcon}</span>
        )}

        <span>{isLoading && loadingText ? loadingText : children}</span>

        {!isLoading && rightIcon && (
          <span className={styles.icon}>{rightIcon}</span>
        )}
      </Element>
    );
  },
);

Button.displayName = "Button";
