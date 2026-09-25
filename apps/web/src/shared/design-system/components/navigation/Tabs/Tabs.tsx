import { forwardRef, type ElementType } from "react";
import styles from "./Tabs.module.css";
import type { TabLinkProps, TabsProps } from "./Tabs.types";
import { classNames } from "../../shared";
import { navigatingElement } from "../navigationElement";

/**
 * A set of addresses, one of which the reader is at. Not the tab pattern that
 * swaps panels in place: each of these is somewhere a reader can arrive at,
 * link to and come back to, which is what makes it navigation rather than a
 * control — so it is a labelled landmark, and the current one says so with
 * `aria-current` rather than with a selected state.
 */
export const Tabs = forwardRef<HTMLElement, TabsProps>(
  ({ label, children, className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label={label}
      className={classNames(styles.root, className)}
      {...props}
    >
      {children}
    </nav>
  ),
);

Tabs.displayName = "Tabs";

export const TabLink = forwardRef<HTMLAnchorElement, TabLinkProps>(
  ({ current = false, className, ...props }, ref) => {
    const Element = navigatingElement() as ElementType;

    return (
      <Element
        ref={ref}
        // The page a reader is on, not a control they have chosen: `page` is the
        // word for a destination, and `true` would be the word for a choice.
        aria-current={current ? "page" : undefined}
        className={classNames(styles.tab, className)}
        {...props}
      />
    );
  },
);

TabLink.displayName = "TabLink";
