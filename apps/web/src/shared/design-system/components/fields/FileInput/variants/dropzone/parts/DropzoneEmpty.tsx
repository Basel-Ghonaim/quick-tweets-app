import { UploadIcon } from "../../../../../../icons";
import styles from "../../../FileInput.module.css";
import type { DropzoneFileInputContent } from "../../../FileInput.types";

interface DropzoneEmptyProps {
  /** "image" for image-only fields, "file" for general files */
  mode: "image" | "file";
  /** Whether a file is being dragged over */
  isDragOver: boolean;
  content: Pick<DropzoneFileInputContent, "dragFiles" | "dragImages" | "dropFiles" | "dropImages" | "browse">;
}

/**
 * Empty state for the dropzone — icon, title, and subtext.
 * Used by both image-only and general file modes.
 */
export const DropzoneEmpty = ({ mode, isDragOver, content }: DropzoneEmptyProps) => {
  if (isDragOver) {
    return (
      <>
        <UploadIcon size={32} />
        <span className={styles.dropzoneTitle}>
          {mode === "image" ? content.dropImages : content.dropFiles}
        </span>
      </>
    );
  }

  return (
    <>
      <UploadIcon size={32} />
      <span className={styles.dropzoneTitle}>
        {mode === "image" ? content.dragImages : content.dragFiles}
      </span>
      <span className={styles.dropzoneSubtext}>{content.browse}</span>
    </>
  );
};
