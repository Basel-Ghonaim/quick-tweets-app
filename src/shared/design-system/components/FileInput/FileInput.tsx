import { forwardRef, useId, useRef, useState } from "react";
import styles from "./FileInput.module.css";
import type { FileInputProps } from "./FileInput.types";

/** Upload icon used in the Standard variant trigger button */
const UploadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      name,
      label,
      variant = "standard",
      color = "primary",
      accept,
      multiple = false,
      isInvalid = false,
      errorMessage,
      helperText,
      disabled = false,
      fullWidth = false,
      className = "",
      children,
      onChange,
    },
    ref,
  ) => {
    const generatedId = useId();
    const errorId = `${generatedId}-error`;
    const helperId = `${generatedId}-helper`;
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? internalRef;
    const [displayName, setDisplayName] = useState("");

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : "",
      isInvalid ? styles.isInvalid : "",
      disabled ? styles.isDisabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    /** Dynamic CSS variables injected at runtime based on color prop */
    const dynamicStyles = {
      "--file-input-color": `var(--color-${color}-primary)`,
      "--file-input-alpha": `var(--color-${color}-alpha)`,
    } as React.CSSProperties;

    /** Opens the native file picker when the trigger button is clicked */
    const handleTriggerClick = () => {
      if (disabled) return;
      inputRef.current?.click();
    };

    /** Reads the selected file(s) from the native input and forwards to onChange */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Update display name from the event (not from ref during render)
      if (files.length === 1) {
        setDisplayName(files[0].name);
      } else {
        setDisplayName(`${files.length} files selected`);
      }

      if (multiple) {
        onChange?.(Array.from(files));
      } else {
        onChange?.(files[0]);
      }
    };

    const renderStandard = () => {

      return (
        <div className={styles.standardWrapper} style={dynamicStyles}>
          {/* Hidden native file input — accessible but invisible */}
          <input
            ref={inputRef}
            id={generatedId}
            type="file"
            name={name}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className={styles.nativeInput}
            onChange={handleFileChange}
            aria-invalid={isInvalid}
            aria-describedby={
              [isInvalid && errorMessage ? errorId : "", helperText ? helperId : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
          />

          {/* Trigger button — clicking this opens the file picker */}
          <button
            type="button"
            className={styles.triggerButton}
            onClick={handleTriggerClick}
            disabled={disabled}
            tabIndex={0}
          >
            {children ?? (
              <>
                <UploadIcon />
                <span>Choose file</span>
              </>
            )}
          </button>

          {/* File name display */}
          <span className={styles.fileName}>
            {displayName || "No file chosen"}
          </span>
        </div>
      );
    };

    const renderVariant = () => {
      switch (variant) {
        case "standard":
          return renderStandard();

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

        {helperText && !isInvalid && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}

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
