import { forwardRef, type ElementType } from "react";
import styles from "./Link.module.css";
import type { LinkPlacement, LinkProps, LinkUnderline } from "./Link.types";
import type { Tone } from "../../../foundations";
import { classNames, customProperties } from "../../shared";

/** Targets that reuse the current browsing context, so no opener is exposed. */
const KEEPS_CONTEXT = new Set(["_self", "_parent", "_top"]);

/** A line has to be visible inside a sentence; a permanent one under everything
 *  that stands alone is not what standing alone looks like. */
const DEFAULT_UNDERLINE: Record<LinkPlacement, LinkUnderline> = {
  "in-text": "subtle",
  standalone: "hover",
};

/**
 * Written out rather than built. `tokenReferences` only expands an interpolation
 * spelled `${color}`, so `var(--text-${tone})` would not be checked at all, while
 * a literal reference is (Finding 0021).
 */
const TONE_COLOR: Record<Tone, string> = {
  primary: "var(--text-primary)",
  secondary: "var(--text-secondary)",
  tertiary: "var(--text-tertiary)",
  muted: "var(--text-muted)",
  accent: "var(--text-accent)",
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
      as,
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
        style={customProperties({ "--link-color": TONE_COLOR[tone] }, style)}
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
