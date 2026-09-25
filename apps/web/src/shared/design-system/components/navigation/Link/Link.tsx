import { forwardRef, type ElementType } from "react";
import styles from "./Link.module.css";
import type { LinkPlacement, LinkProps, LinkUnderline } from "./Link.types";
import { classNames, customProperties } from "../../shared";
import { navigatingElement } from "../navigationElement";

/** Targets that reuse the current browsing context, so no opener is exposed. */
const KEEPS_CONTEXT = new Set(["_self", "_parent", "_top"]);

/** A line has to be visible inside a sentence; a permanent one under everything
 *  that stands alone is not what standing alone looks like. */
const DEFAULT_UNDERLINE: Record<LinkPlacement, LinkUnderline> = {
  "in-text": "subtle",
  standalone: "hover",
};

/** Named rather than built, so `classReferences` can read every one of them. */
const UNDERLINE: Record<LinkUnderline, string> = {
  none: styles.underlineNone,
  always: styles.underlineAlways,
  hover: styles.underlineHover,
  subtle: styles.underlineSubtle,
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      placement = "in-text",
      underline,
      tone = "accent",
      href,
      target,
      rel,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    // Taken from the seam rather than from a prop: one place decides what a
    // destination is, so two components cannot disagree about it.
    const Element = navigatingElement() as ElementType;

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
        style={customProperties(
          { "--link-color": `var(--text-${tone})` },
          style,
        )}
        href={href}
        target={target}
        rel={safeRel}
        className={classNames(
          styles.root,
          // Only standing alone carries rules; in a sentence the element's own
          // inline behaviour is what the placement means.
          placement === "standalone" && styles.placementStandalone,
          UNDERLINE[underline ?? DEFAULT_UNDERLINE[placement]],
          className,
        )}
        {...props}
      />
    );
  },
);

Link.displayName = "Link";
