import { useState, type ReactNode } from "react";
import { UploadIcon } from "../../../../icons";
import { formatSize } from "../../formatSize";
import type { VariantContext } from "../variant.types";
import { customProperties } from "../../../shared";
import styles from "../../FileInput.module.css";

interface StandardInputProps {
  context: VariantContext;
  multiple: boolean;
  /** Replaces the default trigger content. */
  trigger?: ReactNode;
}

/**
 * A trigger and the name of what is selected.
 *
 * The lightest of the three: it presents the selection as text rather than a
 * preview, so it owns no object URLs and needs no lifetime management.
 */
export const StandardInput = ({
  context,
  multiple,
  trigger,
}: StandardInputProps) => {
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

  const [displayName, setDisplayName] = useState("");

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    const files = Array.from(selected);

    if (maxSize) {
      const oversized = files.find((file) => file.size > maxSize);
      if (oversized) {
        onValidationError(
          `"${oversized.name}" exceeds the ${formatSize(maxSize)} limit`,
        );
        // Reset so the same file can be chosen again after the message is read.
        event.target.value = "";
        return;
      }
    }

    onValidationError("");
    setDisplayName(
      files.length === 1 ? files[0].name : `${files.length} files selected`,
    );

    onChange?.(event);
    onFilesChange?.(files);
  };

  return (
    <div
      className={styles.standardWrapper}
      style={customProperties({
        "--file-input-color": `var(--color-${color}-primary)`,
        "--file-input-alpha": `var(--color-${color}-alpha)`,
      })}
    >
      <input
        ref={inputRef}
        id={controlId}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className={styles.nativeInput}
        onChange={handleFileChange}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
      />

      <button
        type="button"
        className={styles.triggerButton}
        onClick={openPicker}
        disabled={disabled}
      >
        {trigger ?? (
          <>
            <UploadIcon size={16} />
            <span>Choose file</span>
          </>
        )}
      </button>

      <span className={styles.fileName}>{displayName || "No file chosen"}</span>
    </div>
  );
};
