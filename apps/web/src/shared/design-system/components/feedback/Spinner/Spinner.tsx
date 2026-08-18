import { forwardRef } from "react";
import styles from "./Spinner.module.css";
import type { SpinnerProps } from "./Spinner.types";
import { classNames, customProperties } from "../../shared";

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ color, className, style, ...props }, ref) => (
    <span
      ref={ref}
      className={classNames(styles.root, className)}
      style={customProperties(
        color ? { "--spinner-color": `var(--role-fill-${color})` } : {},
        style,
      )}
      // Hidden by default: the indicator names nothing, and where a busy state
      // must be announced it is the surrounding context that owns the message.
      aria-hidden="true"
      {...props}
    />
  ),
);

Spinner.displayName = "Spinner";
