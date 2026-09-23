import { forwardRef } from "react";
import { CheckIcon } from "../../../icons";
import styles from "./Menu.module.css";
import type { MenuItemProps } from "./Menu.types";
import { classNames, customProperties } from "../../shared";

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ icon, checked, color, className, style, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      // The prop's presence is the whole difference: a command reports no state,
      // and a choice that reports none announces the wrong thing.
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={checked}
      // Focus moves between items by key rather than by Tab, so only the surface
      // is in the tab order and the ring cannot be walked into halfway.
      tabIndex={-1}
      className={classNames(styles.item, className)}
      style={customProperties(
        color ? { "--menu-item-color": `var(--role-on-surface-${color})` } : {},
        style,
      )}
      {...props}
    >
      {icon}
      <span className={styles.label}>{children}</span>
      {checked ? <CheckIcon className={styles.check} /> : null}
    </button>
  ),
);

MenuItem.displayName = "MenuItem";
