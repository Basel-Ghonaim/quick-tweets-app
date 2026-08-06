import { useCallback, useEffect, useRef, useState } from "react";
import { validateSelection } from "../validateSelection";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UseAvatarFileOptions {
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept?: string;
  maxSize?: number;
  disabled: boolean;
  /** The parsed selection, reported whenever it changes. */
  onFilesChange?: (files: File[]) => void;
  /** The platform's own handler, forwarded from the hidden input. */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValidationError: (error: string) => void;
}

export interface UseAvatarFileReturn {
  /** The currently selected file (null if none) */
  file: File | null;
  /** Preview URL for the file (image blob URL, or video thumbnail data URL) */
  preview: string;
  /** Whether a file is being dragged over the avatar */
  isDragOver: boolean;
  /** Whether the file is an image */
  isImage: boolean;
  /** Whether the file is a video */
  isVideo: boolean;

  // Handlers
  handleClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  removeFile: (e: React.MouseEvent) => void;
  replaceFile: (e: React.MouseEvent) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Encapsulates all state and logic for the Avatar variant.
 *
 * Single-file only — accepts one image or one video.
 * Reuses `validateSelection` for accept/maxSize validation.
 */
export function useAvatarFile({
  inputRef,
  accept,
  maxSize,
  disabled,
  onFilesChange,
  onChange,
  onValidationError,
}: UseAvatarFileOptions): UseAvatarFileReturn {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Derived ──

  const isImage = !!file?.type.startsWith("image/");
  const isVideo = !!file?.type.startsWith("video/");

  // ── Preview URL lifecycle ──

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview("");
      return;
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }

    // Video thumbnail generation (canvas capture)
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      const handleLoaded = () => {
        // Seek to 10% of video duration for a representative frame
        video.currentTime = Math.min(video.duration * 0.1, 1);
      };

      const handleSeeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setPreview(canvas.toDataURL("image/jpeg", 0.8));
          }
        } catch {
          // Fallback: no thumbnail available
          setPreview("");
        }
        URL.revokeObjectURL(url);
      };

      video.addEventListener("loadeddata", handleLoaded);
      video.addEventListener("seeked", handleSeeked);

      return () => {
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("seeked", handleSeeked);
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  // ── Drag counter ──

  const dragCounter = useRef(0);

  // ── File selection ──

  const selectFile = useCallback(
    (newFile: File) => {
      setFile(newFile);
      onValidationError("");
      onFilesChange?.([newFile]);
    },
    [onFilesChange, onValidationError],
  );

  // ── Click handler ──

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled, inputRef]);

  // ── Input change handler ──

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const result = validateSelection(files, { accept, maxSize });
      if (result.error) {
        onValidationError(result.error);
        e.target.value = "";
        return;
      }

      selectFile(result.valid[0]);
      onChange?.(e);
    },
    [accept, maxSize, onValidationError, selectFile, onChange],
  );

  // ── Drop handler ──

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const result = validateSelection(files, { accept, maxSize });
      if (result.error) {
        onValidationError(result.error);
        return;
      }

      selectFile(result.valid[0]);
    },
    [disabled, accept, maxSize, onValidationError, selectFile],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current++;
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
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
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFile(null);
      onValidationError("");
      // An empty selection, not an absent one: the control still exists.
      onFilesChange?.([]);
      // Reset native input so re-selecting the same file works
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFilesChange, onValidationError, inputRef],
  );

  // ── Replace file (triggers file picker) ──

  const replaceFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      inputRef.current?.click();
    },
    [inputRef],
  );

  return {
    file,
    preview,
    isDragOver,
    isImage,
    isVideo,
    handleClick,
    handleFileChange,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    removeFile,
    replaceFile,
  };
}
