import { UploadIcon } from "@shared/design-system/icons";
import styles from "../../../FileInput.module.css";

interface DragOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Text shown below the icon */
  label?: string;
}

/**
 * Translucent overlay shown when dragging files over the dropzone.
 * Shared by both image grid and file list modes.
 */
export const DragOverlay = ({
  visible,
  label = "Drop files here",
}: DragOverlayProps) => {
  if (!visible) return null;

  return (
    <div className={styles.imageGridOverlay}>
      <UploadIcon size={32} />
      <span className={styles.dropzoneTitle}>{label}</span>
    </div>
  );
};
