import { useRef, useState } from "react";
import { UploadIcon } from "@shared/design-system/icons";
import { formatSize } from "@shared/design-system/utils";
import styles from "../../FileInput.module.css";
import type { DropzoneInputProps } from "./DropzoneInput.types";

/**
 * Dropzone variant for FileInput.
 *
 * Renders a dashed-border drop zone with upload icon and text.
 * Supports click-to-browse AND drag & drop from the desktop.
 * Visual hover state when dragging a file over the zone.
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
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Counter tracks nested dragenter/dragleave events from child elements.
   * Without this, dragging over a child (icon, text) fires dragleave
   * on the parent, causing the hover state to flicker.
   */
  const dragCounter = useRef(0);

  /** Dynamic CSS variables injected at runtime based on color prop */
  const dynamicStyles = {
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  } as React.CSSProperties;

  /** Build zone classes — adds isDragOver when a file is being dragged over */
  const zoneClasses = [
    styles.dropzoneWrapper,
    isDragOver ? styles.isDragOver : "",
  ]
    .filter(Boolean)
    .join(" ");

  /** Opens the native file picker when the zone is clicked */
  const handleZoneClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  /**
   * Validates a FileList against accept and maxSize constraints.
   * Returns the valid files array, or null if any file fails validation.
   */
  const validateFiles = (files: FileList): File[] | null => {
    const fileArray = Array.from(files);

    // Validate accept — browser enforces this for <input>, but NOT for drop
    if (accept) {
      const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());

      const rejected = fileArray.find((file) => {
        return !acceptedTypes.some((pattern) => {
          // Wildcard match: "image/*"
          if (pattern.endsWith("/*")) {
            const category = pattern.slice(0, -2);
            return file.type.startsWith(category);
          }
          // Extension match: ".pdf", ".doc"
          if (pattern.startsWith(".")) {
            return file.name.toLowerCase().endsWith(pattern);
          }
          // Exact MIME match: "application/pdf"
          return file.type === pattern;
        });
      });

      if (rejected) {
        onValidationError(`"${rejected.name}" is not an accepted file type`);
        return null;
      }
    }

    // Validate maxSize
    if (maxSize) {
      const oversized = fileArray.find((f) => f.size > maxSize);
      if (oversized) {
        onValidationError(
          `"${oversized.name}" exceeds the ${formatSize(maxSize)} limit`,
        );
        return null;
      }
    }

    onValidationError("");
    return fileArray;
  };

  /** Handles files selected via the native file picker */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const valid = validateFiles(files);
    if (!valid) {
      e.target.value = "";
      return;
    }

    updateDisplay(valid);
    onNativeChange?.(e);
    forwardFiles(valid);
  };

  /** Handles files dropped onto the zone */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const valid = validateFiles(files);
    if (!valid) return;

    updateDisplay(valid);
    forwardFiles(valid);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current++;
    if (!disabled) setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  };

  /** Updates the display text based on how many files were selected */
  const updateDisplay = (files: File[]) => {
    if (files.length === 1) {
      setDisplayName(files[0].name);
    } else {
      setDisplayName(`${files.length} files selected`);
    }
  };

  /** Forwards files to onChange — single File or File[] based on multiple prop */
  const forwardFiles = (files: File[]) => {
    if (multiple) {
      onChange?.(files);
    } else {
      onChange?.(files[0]);
    }
  };

  return (
    <div
      className={zoneClasses}
      style={dynamicStyles}
      onClick={handleZoneClick}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
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

      {/* Instructional text — changes during drag and after file selection */}
      <span className={styles.dropzoneTitle}>
        {isDragOver
          ? "Drop files here"
          : displayName || "Drag & drop files here"}
      </span>
      {!isDragOver && (
        <span className={styles.dropzoneSubtext}>
          or click to browse
        </span>
      )}
    </div>
  );
};
