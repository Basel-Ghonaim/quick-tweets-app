import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
} from "react";
import styles from "./Textarea.module.css";
import type { TextareaProps } from "./Textarea.types";
import { classNames, useFieldA11y } from "../../shared";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = "outlined",
      size = "medium",
      isInvalid = false,
      fullWidth = false,
      autoResize = false,
      maxRows,
      resize = "vertical",
      label,
      errorMessage,
      helperText,
      className,
      disabled,
      id,
      onChange,
      ...props
    },
    ref,
  ) => {
    const { controlId, errorId, helperId, showError, describedBy } =
      useFieldA11y({ id, isInvalid, errorMessage, helperText });

    // Growing the control needs to measure it, and the caller may also want it.
    // Published rather than cast, because a forwarded ref may be a callback and
    // casting one fails silently.
    const control = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => control.current as HTMLTextAreaElement, []);

    const grow = useCallback(() => {
      const element = control.current;
      if (!element || !autoResize) return;

      // Measured from the rendered typography rather than assumed: the cap is
      // expressed in rows, and what a row is depends on the style in force.
      element.style.height = "auto";
      const { lineHeight, paddingTop, paddingBottom } =
        getComputedStyle(element);
      const chrome = parseFloat(paddingTop) + parseFloat(paddingBottom);
      const ceiling = maxRows
        ? parseFloat(lineHeight) * maxRows + chrome
        : Infinity;

      element.style.height = `${Math.min(element.scrollHeight, ceiling)}px`;
      element.style.overflowY =
        element.scrollHeight > ceiling ? "auto" : "hidden";
    }, [autoResize, maxRows]);

    // Runs for a caller-driven value change too, not only for typing.
    useLayoutEffect(grow, [grow, props.value, props.defaultValue]);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      grow();
      onChange?.(event);
    };

    return (
      <div
        className={classNames(
          styles.root,
          fullWidth && styles.fullWidth,
          disabled && styles.isDisabled,
          className,
        )}
      >
        {label && (
          <label className={styles.label} htmlFor={controlId}>
            {label}
          </label>
        )}

        <textarea
          ref={control}
          id={controlId}
          className={classNames(
            styles.textarea,
            styles[`variant-${variant}`],
            styles[`size-${size}`],
            isInvalid && styles.isInvalid,
            // A control that grows with its content has no use for a handle,
            // and the type makes the pair unrepresentable in the first place.
            styles[`resize-${autoResize ? "none" : resize}`],
          )}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          {...props}
        />

        {helperText && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}

        {showError && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
