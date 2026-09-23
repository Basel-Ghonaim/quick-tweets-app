import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import styles from "./Dialog.module.css";
import type { DialogProps } from "./Dialog.types";
import { classNames } from "../../shared";

/**
 * A dialog in the browser's top layer. `showModal` carries the parts that are
 * expensive to rebuild and easy to get subtly wrong — focus held inside, focus
 * returned on close, and everything behind it inert.
 */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
  (
    {
      open,
      onClose,
      title,
      description,
      actions,
      actionsLayout = "inline",
      variant = "modal",
      children,
    },
    ref,
  ) => {
    const element = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    // Published rather than cast: the element is this component's, and a
    // forwarded ref may be a callback, which a cast fails to satisfy silently.
    useImperativeHandle(ref, () => element.current as HTMLDialogElement, []);

    useEffect(() => {
      const dialog = element.current;
      if (!dialog) return;

      // `showModal` is what puts it in the top layer; `open` as an attribute
      // would render it in place, unmodal, with none of the guarantees.
      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
      <dialog
        ref={element}
        role={variant === "alert" ? "alertdialog" : undefined}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={classNames(styles.root, styles[variant])}
        onClose={onClose}
        onKeyDown={(event) => {
          // Closed here as well as by the platform, for the reason Menu states:
          // the platform's own dismissal answers real input only.
          if (event.key === "Escape") element.current?.close();
        }}
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </div>
        {description ? (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        ) : null}
        {children ? <div className={styles.body}>{children}</div> : null}
        {actions ? (
          <div className={classNames(styles.actions, styles[actionsLayout])}>
            {actions}
          </div>
        ) : null}
      </dialog>
    );
  },
);

Dialog.displayName = "Dialog";
