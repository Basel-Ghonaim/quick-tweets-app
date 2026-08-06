import styles from "../../FileInput.module.css";
import type { DropzoneInputProps } from "./DropzoneInput.types";
import { useDropzoneFiles } from "./useDropzoneFiles";
import { DragOverlay } from "./parts/DragOverlay";
import { DropzoneEmpty } from "./parts/DropzoneEmpty";
import { ImageGrid } from "./parts/ImageGrid";
import { FileList } from "./parts/FileList";

/**
 * Dropzone variant for FileInput.
 *
 * Thin orchestrator that delegates:
 * - **Logic** → `useDropzoneFiles` hook
 * - **Rendering** → sub-components (DropzoneEmpty, ImageGrid, FileList, DragOverlay)
 *
 * Two modes based on `accept`:
 * - **Image-only** (accept="image/*"): Thumbnail grid with add-more and X delete
 * - **General files**: Bordered list with file type icons and inline previews
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
  const dropzone = useDropzoneFiles({
    inputRef,
    accept,
    maxSize,
    multiple,
    maxFiles,
    minFiles,
    disabled,
    onChange,
    onNativeChange,
    onValidationError,
  });

  // ── Shared ──

  const dynamicStyles = {
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  } as React.CSSProperties;

  const dragProps = {
    onDrop: dropzone.handleDrop,
    onDragEnter: dropzone.handleDragEnter,
    onDragOver: dropzone.handleDragOver,
    onDragLeave: dropzone.handleDragLeave,
  };

  const zoneClasses = [
    styles.dropzoneWrapper,
    dropzone.isDragOver ? styles.isDragOver : "",
    dropzone.isAtCapacity ? styles.isDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  const hiddenInput = (
    <input
      ref={inputRef}
      id={generatedId}
      type="file"
      name={name}
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      className={styles.nativeInput}
      onChange={dropzone.handleFileChange}
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

  if (dropzone.isImageOnly) {
    // Empty state
    if (dropzone.fileList.length === 0) {
      return (
        <div
          className={zoneClasses}
          style={dynamicStyles}
          onClick={dropzone.handleZoneClick}
          {...dragProps}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              dropzone.handleZoneClick();
            }
          }}
        >
          {hiddenInput}
          <DropzoneEmpty mode="image" isDragOver={dropzone.isDragOver} />
        </div>
      );
    }

    // Grid with thumbnails
    return (
      <div
        className={styles.imageGridWrapper}
        style={dynamicStyles}
        {...dragProps}
      >
        {hiddenInput}
        <DragOverlay visible={dropzone.isDragOver} label="Drop images here" />
        <ImageGrid
          files={dropzone.fileList}
          previews={dropzone.previews}
          isAtCapacity={dropzone.isAtCapacity}
          onRemove={dropzone.removeFile}
          onAddMore={dropzone.handleZoneClick}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL FILE MODE
  // ═══════════════════════════════════════════════════════════════════════════

  // Empty state
  if (dropzone.fileList.length === 0) {
    return (
      <div
        className={zoneClasses}
        style={dynamicStyles}
        onClick={dropzone.handleZoneClick}
        {...dragProps}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            dropzone.handleZoneClick();
          }
        }}
      >
        {hiddenInput}
        <DropzoneEmpty mode="file" isDragOver={dropzone.isDragOver} />
      </div>
    );
  }

  // Bordered file list
  return (
    <div
      className={styles.fileListWrapper}
      style={dynamicStyles}
      {...dragProps}
    >
      {hiddenInput}
      <DragOverlay visible={dropzone.isDragOver} />
      <FileList
        files={dropzone.fileList}
        previews={dropzone.previews}
        multiple={multiple}
        isAtCapacity={dropzone.isAtCapacity}
        onRemove={dropzone.removeFile}
        onAddMore={dropzone.handleZoneClick}
      />
    </div>
  );
};
