import { useState } from "react";
import { UploadIcon } from "@shared/design-system/icons";
import { formatSize } from "@shared/design-system/utils";
import styles from "../../FileInput.module.css";
import type { DropzoneInputProps } from "./DropzoneInput.types";

/**
 * Dropzone variant for FileInput.
 *
 * Renders a dashed-border drop zone with upload icon and text.
 * Click anywhere to open the file picker. Drag & drop will
 * be added in Step 2.3.
 */
export const DropzoneInput = ({
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
  onChange,
  onNativeChange,
  onValidationError,
}: DropzoneInputProps) => {
  const [displayName, setDisplayName] = useState("");

  /** Dynamic CSS variables injected at runtime based on color prop */
  const dynamicStyles = {
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  } as React.CSSProperties;

  /** Opens the native file picker when the zone is clicked */
  const handleZoneClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  /** Reads the selected file(s), validates size, and forwards to onChange */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate maxSize
    if (maxSize) {
      const oversized = Array.from(files).find((f) => f.size > maxSize);
      if (oversized) {
        onValidationError(
          `"${oversized.name}" exceeds the ${formatSize(maxSize)} limit`,
        );
        e.target.value = "";
        return;
      }
    }

    onValidationError("");

    // Update display text
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
    <div
      className={styles.dropzoneWrapper}
      style={dynamicStyles}
      onClick={handleZoneClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleZoneClick();
        }
      }}
    >
      {/* Hidden native file input */}
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

      {/* Upload icon */}
      <UploadIcon size={32} />

      {/* Instructional text */}
      <span className={styles.dropzoneTitle}>
        {displayName || "Drag & drop files here"}
      </span>
      <span className={styles.dropzoneSubtext}>
        or click to browse
      </span>
    </div>
  );
};
