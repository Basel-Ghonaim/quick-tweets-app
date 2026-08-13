import { UploadIcon } from "../../../../../../icons";
import styles from "../../../FileInput.module.css";

interface DropzoneEmptyProps {
  /** "image" for image-only fields, "file" for general files */
  mode: "image" | "file";
  /** Whether a file is being dragged over */
  isDragOver: boolean;
}

/**
 * Empty state for the dropzone — icon, title, and subtext.
 * Used by both image-only and general file modes.
 */
export const DropzoneEmpty = ({ mode, isDragOver }: DropzoneEmptyProps) => {
  const noun = mode === "image" ? "images" : "files";

  if (isDragOver) {
    return (
      <>
        <UploadIcon size={32} />
        <span className={styles.dropzoneTitle}>Drop {noun} here</span>
      </>
    );
  }

  return (
    <>
      <UploadIcon size={32} />
      <span className={styles.dropzoneTitle}>
        Drag & drop {noun} here
      </span>
      <span className={styles.dropzoneSubtext}>or click to browse</span>
    </>
  );
};
