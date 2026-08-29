import { forwardRef, type ElementType } from "react";
import styles from "./Link.module.css";
import type { LinkProps } from "./Link.types";
import { classNames } from "../../shared";

/** Targets that reuse the current browsing context, so no opener is exposed. */
const KEEPS_CONTEXT = new Set(["_self", "_parent", "_top"]);

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ as, variant = "in-text", href, target, rel, className, ...props }, ref) => {
    const Element = (as ?? "a") as ElementType;

    // `noopener` is the layer's guarantee; `noreferrer` stays the caller's,
    // against the convention of forcing both -- a referrer stance is a product's.
    const opensNewContext = target !== undefined && !KEEPS_CONTEXT.has(target);
    const declared = rel ? rel.split(/\s+/).filter(Boolean) : [];
    const safeRel = opensNewContext
      ? [...new Set([...declared, "noopener"])].join(" ")
      : rel;

    return (
      <Element
        ref={ref}
        href={href}
        target={target}
        rel={safeRel}
        className={classNames(
          styles.root,
          // Named rather than interpolated: two members, and `classReferences`
          // reads a dot access where it cannot read a built name.
          variant === "in-text" ? styles.variantInText : styles.variantStandalone,
          className,
        )}
        {...props}
      />
    );
  },
);

Link.displayName = "Link";
