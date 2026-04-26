import { forwardRef, useId } from "react";
import styles from "./FileInput.module.css";
import type { FileInputProps } from "./FileInput.types";

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      name: _name,
      label,
      variant = "standard",
      color: _color = "primary",
      isInvalid = false,
      errorMessage,
      disabled = false,
      fullWidth = false,
      className = "",
    },
    _ref,
  ) => {
    const generatedId = useId();
    const errorId = `${generatedId}-error`;

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : "",
      isInvalid ? styles.isInvalid : "",
      disabled ? styles.isDisabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const renderVariant = () => {
      switch (variant) {
        case "standard":
          return <div className={styles.placeholder}>Standard (Step 1.3)</div>;

        case "dropzone":
          return <div className={styles.placeholder}>Dropzone (Phase 2)</div>;

        case "avatar":
          return <div className={styles.placeholder}>Avatar (Phase 3)</div>;

        default:
          return null;
      }
    };

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={generatedId} className={styles.label}>
            {label}
          </label>
        )}

        {renderVariant()}

        {isInvalid && errorMessage && (
          <span id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);

FileInput.displayName = "FileInput";
