import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadIcon,
  TrashIcon,
  XIcon,
  PlusIcon,
} from "@shared/design-system/icons";
import { formatSize } from "@shared/design-system/utils";
import styles from "../../FileInput.module.css";
import type { DropzoneInputProps } from "./DropzoneInput.types";

/**
 * Dropzone variant for FileInput.
 *
 * Two modes based on `accept`:
 * - **Image-only** (accept="image/*"): Grid of thumbnails with
 *   add-more button, drag overlay, and X delete per image.
 * - **General files**: Dashed-border drop zone with text file list
 *   (first 3 inside, overflow below).
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
  maxFiles,
  minFiles,
  disabled,
  isInvalid,
  errorMessage,
  helperText,
  color,
  onChange,
  onNativeChange,
  onValidationError,
}: DropzoneInputProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileList, setFileList] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  /** Detect if this field only accepts images */
  const isImageOnly = !!accept
    ?.split(",")
    .every((t) => t.trim().toLowerCase().startsWith("image/"));

  /** Whether we've hit the file limit */
  const isAtCapacity = !!(maxFiles && fileList.length >= maxFiles);

  // ── Preview URLs (image-only mode) ──

  useEffect(() => {
    if (!isImageOnly) return;
    const urls = fileList.map((file) => URL.createObjectURL(file));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [fileList, isImageOnly]);

  // ── Drag counter (prevents flicker on child elements) ──

  const dragCounter = useRef(0);

  // ── CSS variables ──

  const dynamicStyles = {
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  } as React.CSSProperties;

  // ── Zone classes (general file mode) ──

  const zoneClasses = [
    styles.dropzoneWrapper,
    isDragOver ? styles.isDragOver : "",
    isAtCapacity ? styles.isDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── Click handler ──

  const handleZoneClick = useCallback(() => {
    if (disabled || isAtCapacity) return;
    inputRef.current?.click();
  }, [disabled, isAtCapacity, inputRef]);

  // ── Validation ──

  const validateFiles = (files: FileList): File[] | null => {
    const fileArray = Array.from(files);

    // Validate accept — browser enforces for <input>, NOT for drop
    if (accept) {
      const acceptedTypes = accept
        .split(",")
        .map((t) => t.trim().toLowerCase());
      const rejected = fileArray.find((file) => {
        return !acceptedTypes.some((pattern) => {
          if (pattern.endsWith("/*")) {
            return file.type.startsWith(pattern.slice(0, -2));
          }
          if (pattern.startsWith(".")) {
            return file.name.toLowerCase().endsWith(pattern);
          }
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

  // ── File accumulation ──

  const accumulateFiles = (newFiles: File[]): File[] | null => {
    if (multiple) {
      const merged = [...fileList, ...newFiles];
      if (maxFiles && merged.length > maxFiles) {
        onValidationError(`Maximum ${maxFiles} files allowed`);
        return null;
      }
      setFileList(merged);
      onValidationError("");
      return merged;
    } else {
      setFileList(newFiles);
      onValidationError("");
      return newFiles;
    }
  };

  const forwardFiles = (files: File[]) => {
    if (multiple) {
      onChange?.(files);
    } else {
      onChange?.(files[0]);
    }
  };

  // ── Input change handler ──

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const valid = validateFiles(files);
    if (!valid) {
      e.target.value = "";
      return;
    }

    const accumulated = accumulateFiles(valid);
    if (!accumulated) {
      e.target.value = "";
      return;
    }

    onNativeChange?.(e);
    forwardFiles(accumulated);
  };

  // ── Drop handler ──

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (disabled || isAtCapacity) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const valid = validateFiles(files);
    if (!valid) return;

    const accumulated = accumulateFiles(valid);
    if (!accumulated) return;
    forwardFiles(accumulated);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current++;
    if (!disabled && !isAtCapacity) setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  };

  // ── Remove file ──

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = fileList.filter((_, i) => i !== index);

    if (minFiles && updated.length < minFiles) {
      onValidationError(`Minimum ${minFiles} files required`);
      return;
    }

    setFileList(updated);
    onValidationError("");
    forwardFiles(updated);
  };

  // ── Helper: render a single file row (non-image mode) ──

  const renderFileItem = (file: File, index: number) => (
    <li key={`${file.name}-${index}`} className={styles.dropzoneFileItem}>
      <span className={styles.dropzoneFileName}>{file.name}</span>
      <span className={styles.dropzoneFileSize}>{formatSize(file.size)}</span>
      <button
        type="button"
        className={styles.dropzoneRemoveBtn}
        onClick={(e) => removeFile(index, e)}
        aria-label={`Remove ${file.name}`}
      >
        <TrashIcon size={14} />
      </button>
    </li>
  );

  // ── Hidden native input (shared by both modes) ──

  const renderHiddenInput = () => (
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
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE-ONLY MODE
  // ═══════════════════════════════════════════════════════════════════════════

  if (isImageOnly) {
    // Empty state — show normal dropzone
    if (fileList.length === 0) {
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
          {renderHiddenInput()}

          {isDragOver ? (
            <>
              <UploadIcon size={32} />
              <span className={styles.dropzoneTitle}>Drop images here</span>
            </>
          ) : (
            <>
              <UploadIcon size={32} />
              <span className={styles.dropzoneTitle}>
                Drag & drop images here
              </span>
              <span className={styles.dropzoneSubtext}>or click to browse</span>
            </>
          )}
        </div>
      );
    }

    // Images exist — show grid
    return (
      <div
        className={styles.imageGridWrapper}
        style={dynamicStyles}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {renderHiddenInput()}

        {/* Drag overlay — covers the entire grid */}
        {isDragOver && (
          <div className={styles.imageGridOverlay}>
            <UploadIcon size={32} />
            <span className={styles.dropzoneTitle}>Drop images here</span>
          </div>
        )}

        {/* Thumbnail grid */}
        <div className={styles.imageGrid}>
          {fileList.map((file, index) => (
            <div key={`thumb-${index}`} className={styles.thumbnailWrapper}>
              <img
                src={previews[index]}
                alt={file.name}
                className={styles.thumbnailImg}
              />
              <button
                type="button"
                className={styles.thumbnailRemoveBtn}
                onClick={(e) => removeFile(index, e)}
                aria-label={`Remove ${file.name}`}
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}

          {/* "Add more" button — same size as thumbnails */}
          {!isAtCapacity && (
            <button
              type="button"
              className={styles.addMoreBtn}
              onClick={handleZoneClick}
              aria-label="Add more images"
            >
              <PlusIcon size={20} />
              <span>Add more</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL FILE MODE (non-image)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
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
        {renderHiddenInput()}

        {/* Empty state */}
        {fileList.length === 0 && !isDragOver && (
          <>
            <UploadIcon size={32} />
            <span className={styles.dropzoneTitle}>Drag & drop files here</span>
            <span className={styles.dropzoneSubtext}>or click to browse</span>
          </>
        )}

        {/* Drag-over state */}
        {isDragOver && (
          <>
            <UploadIcon size={32} />
            <span className={styles.dropzoneTitle}>
              {fileList.length > 0 ? "Drop to add more" : "Drop files here"}
            </span>
          </>
        )}

        {/* First 3 files inside the box */}
        {fileList.length > 0 && !isDragOver && (
          <>
            <ul className={styles.dropzoneFileList}>
              {fileList
                .slice(0, 3)
                .map((file, index) => renderFileItem(file, index))}
            </ul>
            <span className={styles.dropzoneSubtext}>
              {isAtCapacity
                ? "Maximum files reached"
                : fileList.length > 3
                  ? `+${fileList.length - 3} more — drop or click to add`
                  : "Drop or click to add more"}
            </span>
          </>
        )}
      </div>

      {/* Overflow files below the box */}
      {fileList.length > 3 && !isDragOver && (
        <ul className={styles.dropzoneFileList}>
          {fileList
            .slice(3)
            .map((file, index) => renderFileItem(file, index + 3))}
        </ul>
      )}
    </>
  );
};