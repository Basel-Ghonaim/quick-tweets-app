import { useState, type ReactNode } from "react";
import { UploadIcon } from "../../../../../icons";
import type { VariantContext } from "../variant.types";
import type { StandardFileInputContent } from "../../FileInput.types";
import styles from "../../FileInput.module.css";

interface StandardInputProps {
  context: VariantContext;
  content: StandardFileInputContent;
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
  content,
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
    onChange,
    onFilesChange,
    onValidationError,
  } = context;

  // A file's name is the reader's own words, and a count of files is the catalogue's.
  const [chosen, setChosen] = useState<{ text: string; isName: boolean } | null>(null);

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
        onValidationError(content.tooLarge(oversized.name, content.size(maxSize)));
        // Reset so the same file can be chosen again after the message is read.
        event.target.value = "";
        return;
      }
    }

    onValidationError("");
    setChosen(
      files.length === 1
        ? { text: files[0].name, isName: true }
        : { text: content.chosenCount(files.length), isName: false },
    );

    onChange?.(event);
    onFilesChange?.(files);
  };

  return (
    <div
      className={styles.standardWrapper}
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
            <span>{content.choose}</span>
          </>
        )}
      </button>

      <span className={styles.fileName} dir={chosen?.isName ? "auto" : undefined}>
        {chosen?.text || content.nothingChosen}
      </span>
    </div>
  );
};
