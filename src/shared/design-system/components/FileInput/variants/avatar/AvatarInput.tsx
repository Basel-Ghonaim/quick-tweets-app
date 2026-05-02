import styles from "../../FileInput.module.css";
import type { AvatarInputProps } from "./AvatarInput.types";
import { useAvatarFile } from "./useAvatarFile";
import { AvatarEmpty } from "./components/AvatarEmpty";

/**
 * Avatar variant for FileInput.
 *
 * Thin orchestrator that delegates:
 * - **Logic** → `useAvatarFile` hook
 * - **Empty state** → `AvatarEmpty` sub-component
 *
 * Four visual styles based on avatarShape × avatarFill:
 * - circle + default | circle + outline
 * - rectangle + default | rectangle + outline
 *
 * Single-file only — accepts one image or one video.
 */
export const AvatarInput = ({
  inputRef,
  generatedId,
  errorId,
  helperId,
  name,
  accept,
  maxSize,
  disabled,
  isInvalid,
  errorMessage,
  helperText,
  color,
  avatarShape,
  avatarFill,
  onChange,
  onNativeChange,
  onValidationError,
}: AvatarInputProps) => {
  const avatar = useAvatarFile({
    inputRef,
    accept,
    maxSize,
    disabled,
    onChange,
    onNativeChange,
    onValidationError,
  });

  // ── CSS variables ──

  const dynamicStyles = {
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  } as React.CSSProperties;

  // ── Container classes ──

  const containerClasses = [
    styles.avatarWrapper,
    avatarShape === "circle" ? styles.avatarCircle : styles.avatarRectangle,
    avatar.file
      ? styles.avatarFilled
      : avatarFill === "outline"
        ? styles.avatarOutline
        : styles.avatarDefault,
    avatar.isDragOver ? styles.avatarDragOver : "",
    disabled ? styles.isDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── Drag props ──

  const dragProps = {
    onDrop: avatar.handleDrop,
    onDragEnter: avatar.handleDragEnter,
    onDragOver: avatar.handleDragOver,
    onDragLeave: avatar.handleDragLeave,
  };

  // ── Hidden input ──

  const hiddenInput = (
    <input
      ref={inputRef}
      id={generatedId}
      type="file"
      name={name}
      accept={accept}
      multiple={false}
      disabled={disabled}
      className={styles.nativeInput}
      onChange={avatar.handleFileChange}
      aria-invalid={isInvalid}
      aria-describedby={
        [isInvalid && errorMessage ? errorId : "", helperText ? helperId : ""]
          .filter(Boolean)
          .join(" ") || undefined
      }
    />
  );

  // ── File exists → show preview ──

  if (avatar.file && avatar.preview) {
    return (
      <div
        className={containerClasses}
        style={dynamicStyles}
        {...dragProps}
      >
        {hiddenInput}
        <img
          src={avatar.preview}
          alt={avatar.file.name}
          className={styles.avatarPreviewImg}
        />

        {/* Hover overlay with Delete / Replace */}
        <div className={styles.avatarOverlay}>
          <button
            type="button"
            className={styles.avatarOverlayBtn}
            onClick={avatar.removeFile}
            aria-label="Delete file"
          >
            Delete
          </button>
          <button
            type="button"
            className={styles.avatarOverlayBtn}
            onClick={avatar.replaceFile}
            aria-label="Replace file"
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ──

  return (
    <div
      className={containerClasses}
      style={dynamicStyles}
      onClick={avatar.handleClick}
      {...dragProps}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          avatar.handleClick();
        }
      }}
    >
      {hiddenInput}
      <AvatarEmpty fill={avatarFill} />
    </div>
  );
};
