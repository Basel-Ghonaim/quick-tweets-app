import { forwardRef } from "react";
import type { NativeProps } from "../../shared";
import { IconButton } from "../../controls/IconButton";
import { XIcon } from "../../../icons";
import styles from "./Toast.module.css";
import type { ToastProps } from "./Toast.types";
import { classNames, customProperties } from "../../shared";

/**
 * A brief report of something that already happened. Polite by construction:
 * it waits its turn rather than interrupting, because nothing here needs acting
 * on — anything that does belongs somewhere a reader can return to.
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    { color, icon, action, onDismiss, dismissLabel, className, style, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      className={classNames(styles.root, className)}
      style={customProperties(
        color ? { "--toast-icon-color": `var(--role-on-surface-${color})` } : {},
        style,
      )}
      {...props}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.message}>{props.children}</span>
      {action}
      {onDismiss ? (
        <IconButton
          variant="ghost"
          shape="circle"
          icon={<XIcon />}
          aria-label={dismissLabel}
          onClick={onDismiss}
        />
      ) : null}
    </div>
  ),
);

Toast.displayName = "Toast";

/**
 * Where toasts sit. It spans the page and passes pointer events through, so the
 * band it occupies does not swallow clicks meant for what is underneath.
 */
export const ToastRegion = forwardRef<HTMLDivElement, NativeProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={classNames(styles.region, className)} {...props} />
  ),
);

ToastRegion.displayName = "ToastRegion";
