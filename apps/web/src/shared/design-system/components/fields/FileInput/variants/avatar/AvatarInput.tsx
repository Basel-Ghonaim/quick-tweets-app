import styles from "../../FileInput.module.css";
import type { VariantContext } from "../variant.types";
import type {
  AvatarBorder,
  AvatarFileInputContent,
  AvatarFill,
  AvatarShape,
} from "../../FileInput.types";
import { customProperties } from "../../../../shared";
import { useAvatarFile } from "./useAvatarFile";
import { AvatarEmpty } from "./parts/AvatarEmpty";
import { AvatarOverlay } from "./parts/AvatarOverlay";

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
interface AvatarInputProps {
  context: VariantContext;
  content: AvatarFileInputContent;
  avatarShape: AvatarShape;
  avatarFill: AvatarFill;
  avatarBorder: AvatarBorder;
  avatarSize: number;
}

export const AvatarInput = ({
  context,
  content,
  avatarShape,
  avatarFill,
  avatarBorder,
  avatarSize,
}: AvatarInputProps) => {
  const {
    inputRef,
    controlId,
    describedBy,
    name,
    accept,
    maxSize,
    disabled,
    isInvalid,
    onChange,
    onFilesChange,
    onValidationError,
  } = context;

  const avatar = useAvatarFile({
    inputRef,
    content,
    accept,
    maxSize,
    disabled,
    onChange,
    onFilesChange,
    onValidationError,
  });

  // ── CSS variables ──

  const dynamicStyles = customProperties({
    "--avatar-size": `${avatarSize}px`,
    "--avatar-border-style": avatarBorder,
  });

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
      id={controlId}
      type="file"
      name={name}
      accept={accept}
      multiple={false}
      disabled={disabled}
      className={styles.nativeInput}
      onChange={avatar.handleFileChange}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
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
        <AvatarOverlay
          content={content}
          onDelete={avatar.removeFile}
          onReplace={avatar.replaceFile}
          disabled={disabled}
        />
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
    >
      {hiddenInput}
      <AvatarEmpty fill={avatarFill} content={content} />
    </div>
  );
};
