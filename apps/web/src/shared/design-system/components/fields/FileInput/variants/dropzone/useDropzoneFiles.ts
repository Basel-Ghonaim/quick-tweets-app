import { useCallback, useEffect, useRef, useState } from "react";
import { validateSelection } from "../validateSelection";
import type { DropzoneFileInputContent } from "../../FileInput.types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UseDropzoneFilesOptions {
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** The words a refused selection is reported in. */
  content: Pick<DropzoneFileInputContent, "notAccepted" | "tooLarge" | "tooMany" | "tooFew">;
  accept?: string;
  maxSize?: number;
  multiple: boolean;
  maxFiles?: number;
  minFiles?: number;
  disabled: boolean;
  /** The parsed selection, reported whenever it changes. */
  onFilesChange?: (files: File[]) => void;
  /** The platform's own handler, forwarded from the hidden input. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValidationError: (error: string) => void;
}

export interface UseDropzoneFilesReturn {
  // State
  fileList: File[];
  previews: string[];
  isDragOver: boolean;

  // Derived
  isImageOnly: boolean;
  isAtCapacity: boolean;

  // Handlers
  handleZoneClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  removeFile: (index: number, e: React.MouseEvent) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Encapsulates all state and logic for the Dropzone variant.
 *
 * Manages file accumulation, validation, drag & drop events,
 * preview URL lifecycle, and capacity constraints.
 */
export function useDropzoneFiles({
  inputRef,
  content,
  accept,
  maxSize,
  multiple,
  maxFiles,
  minFiles,
  disabled,
  onFilesChange,
  onChange,
  onValidationError,
}: UseDropzoneFilesOptions): UseDropzoneFilesReturn {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileList, setFileList] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // ── Derived values ──

  const isImageOnly = !!accept
    ?.split(",")
    .every((t) => t.trim().toLowerCase().startsWith("image/"));

  const isAtCapacity = !!(maxFiles && fileList.length >= maxFiles);

  // ── Preview URLs (for image files in any mode) ──

  useEffect(() => {
    const urls = fileList.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () =>
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
  }, [fileList]);

  // ── Drag counter (prevents flicker on child elements) ──

  const dragCounter = useRef(0);

  // ── Click handler ──

  const handleZoneClick = useCallback(() => {
    if (disabled || isAtCapacity) return;
    inputRef.current?.click();
  }, [disabled, isAtCapacity, inputRef]);

  // ── File forwarding ──

  // Always a list, single-file mode included: a caller that handles one shape
  // handles both, and the cardinality is already declared by `multiple`.
  const forwardFiles = useCallback(
    (files: File[]) => {
      onFilesChange?.(files);
    },
    [onFilesChange],
  );

  // ── File accumulation ──

  const accumulateFiles = useCallback(
    (newFiles: File[]): File[] | null => {
      if (multiple) {
        const merged = [...fileList, ...newFiles];
        if (maxFiles && merged.length > maxFiles) {
          onValidationError(content.tooMany(maxFiles));
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
    },
    [multiple, fileList, maxFiles, content, onValidationError],
  );

  // ── Input change handler ──

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const result = validateSelection(files, { accept, maxSize }, content);
      if (result.error) {
        onValidationError(result.error);
        e.target.value = "";
        return;
      }

      const accumulated = accumulateFiles(result.valid);
      if (!accumulated) {
        e.target.value = "";
        return;
      }

      onChange?.(e);
      forwardFiles(accumulated);
    },
    [accept, maxSize, content, onValidationError, accumulateFiles, onChange, forwardFiles],
  );

  // ── Drop handler ──

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      if (disabled || isAtCapacity) return;

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const result = validateSelection(files, { accept, maxSize }, content);
      if (result.error) {
        onValidationError(result.error);
        return;
      }

      const accumulated = accumulateFiles(result.valid);
      if (!accumulated) return;
      forwardFiles(accumulated);
    },
    [disabled, isAtCapacity, accept, maxSize, content, onValidationError, accumulateFiles, forwardFiles],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current++;
      if (!disabled && !isAtCapacity) setIsDragOver(true);
    },
    [disabled, isAtCapacity],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDragOver(false);
    },
    [],
  );

  // ── Remove file ──

  const removeFile = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (disabled) return;
      e.stopPropagation();
      const updated = fileList.filter((_, i) => i !== index);

      if (minFiles && updated.length < minFiles) {
        onValidationError(content.tooFew(minFiles));
        return;
      }

      setFileList(updated);
      onValidationError("");
      forwardFiles(updated);
    },
    [disabled, fileList, minFiles, content, onValidationError, forwardFiles],
  );

  return {
    fileList,
    previews,
    isDragOver,
    isImageOnly,
    isAtCapacity,
    handleZoneClick,
    handleFileChange,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    removeFile,
  };
}
