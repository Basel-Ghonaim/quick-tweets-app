import styles from "../../FileInput.module.css";
import type { VariantContext } from "../variant.types";
import { customProperties } from "../../../shared";
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
interface DropzoneInputProps {
  context: VariantContext;
  multiple: boolean;
  maxFiles?: number;
  minFiles?: number;
}

export const DropzoneInput = ({
  context,
  multiple,
  maxFiles,
  minFiles,
}: DropzoneInputProps) => {
  const {
    inputRef,
    controlId,
    describedBy,
    name,
    accept,
    maxSize,
    disabled,
    isInvalid,
    color,
    onChange,
    onFilesChange,
    onValidationError,
  } = context;

  const dropzone = useDropzoneFiles({
    inputRef,
    accept,
    maxSize,
    multiple,
    maxFiles,
    minFiles,
    disabled,
    onChange,
    onFilesChange,
    onValidationError,
  });

  // ── Shared ──

  const dynamicStyles = customProperties({
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  });

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
      id={controlId}
      type="file"
      name={name}
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      className={styles.nativeInput}
      onChange={dropzone.handleFileChange}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
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
