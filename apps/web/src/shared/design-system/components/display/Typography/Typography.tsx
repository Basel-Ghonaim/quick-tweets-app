import { forwardRef, type ElementType } from "react";
import styles from "./Typography.module.css";
import type { TypographyProps } from "./Typography.types";
import { classNames } from "../../shared";

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ as, variant = "body-medium", tone, className, ...props }, ref) => {
    // The element is a union, so each member wants its own ref type while the
    // component publishes one. Widened here rather than at the call site, which
    // is where the restriction on `as` is doing its work.
    const Element = (as ?? "p") as ElementType;

    return (
      <Element
        ref={ref}
        className={classNames(
          styles.root,
          styles[`variant-${variant}`],
          tone && styles[`tone-${tone}`],
          className,
        )}
        {...props}
      />
    );
  },
);

Typography.displayName = "Typography";
