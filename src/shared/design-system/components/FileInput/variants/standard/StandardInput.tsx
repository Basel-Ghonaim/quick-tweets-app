import { useState } from "react";
import { UploadIcon } from "@shared/design-system/icons";
import { formatSize } from "../../formatSize";
import type { StandardInputProps } from "./StandardInput.types";
import styles from "../../FileInput.module.css";

/**
 * Standard variant for FileInput.
 *
 * Renders a hidden native file input, a styled trigger button,
 * and a file name display. Owns its own state (displayName)
 * and change handling (validation + forwarding).
 */
export const StandardInput = ({
  inputRef,
  generatedId,
  errorId,
  helperId,
  name,
  accept,
  maxSize,
  multiple,
  disabled,
  isInvalid,
  errorMessage,
  helperText,
  color,
  children,
  onChange,
  onNativeChange,
  onValidationError,
}: StandardInputProps) => {
  const [displayName, setDisplayName] = useState("");

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

  /** Reads the selected file(s), validates size, and forwards to onChange */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate maxSize — reject if any file exceeds the limit
    if (maxSize) {
      const oversized = Array.from(files).find((f) => f.size > maxSize);
      if (oversized) {
        onValidationError(
          `"${oversized.name}" exceeds the ${formatSize(maxSize)} limit`,
        );
        // Reset the native input so the same file can be re-selected
        e.target.value = "";
        return;
      }
    }

    // Clear any previous validation error
    onValidationError("");

    // Update display name from the event (not from ref during render)
    if (files.length === 1) {
      setDisplayName(files[0].name);
    } else {
      setDisplayName(`${files.length} files selected`);
    }

    // Forward the raw native event to form engines
    onNativeChange?.(e);

    if (multiple) {
      onChange?.(Array.from(files));
    } else {
      onChange?.(files[0]);
    }
  };

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
          [
            isInvalid && errorMessage ? errorId : "",
            helperText ? helperId : "",
          ]
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
            <UploadIcon size={16} />
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
