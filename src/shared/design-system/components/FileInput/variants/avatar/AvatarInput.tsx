import { CameraIcon } from "@shared/design-system/icons";
import styles from "../../FileInput.module.css";
import type { AvatarInputProps } from "./AvatarInput.types";

/**
 * Avatar variant for FileInput.
 *
 * Renders a media upload area in one of four styles:
 * - circle + default:  round, dashed border, upload prompt
 * - circle + outline:  round, gray background, placeholder icon
 * - rectangle + default:  rectangular, dashed border, upload prompt
 * - rectangle + outline:  rectangular, gray background, placeholder icon
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
  disabled,
  isInvalid,
  errorMessage,
  helperText,
  color,
  avatarShape,
  avatarFill,
}: AvatarInputProps) => {
  // ── CSS variables ──

  const dynamicStyles = {
    "--file-input-color": `var(--color-${color}-primary)`,
    "--file-input-alpha": `var(--color-${color}-alpha)`,
  } as React.CSSProperties;

  // ── Container classes ──

  const containerClasses = [
    styles.avatarWrapper,
    avatarShape === "circle" ? styles.avatarCircle : styles.avatarRectangle,
    avatarFill === "outline" ? styles.avatarOutline : styles.avatarDefault,
    disabled ? styles.isDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── Click handler ──

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
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
      aria-invalid={isInvalid}
      aria-describedby={
        [isInvalid && errorMessage ? errorId : "", helperText ? helperId : ""]
          .filter(Boolean)
          .join(" ") || undefined
      }
    />
  );

  // ── Empty state (Phase 3.2 will extract this) ──

  return (
    <div
      className={containerClasses}
      style={dynamicStyles}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {hiddenInput}
      <CameraIcon size={24} />
      <span className={styles.avatarText}>
        {avatarFill === "outline" ? "Upload" : "Upload media"}
      </span>
    </div>
  );
};
