import styles from "../../../FileInput.module.css";

interface AvatarOverlayProps {
  /** Callback to delete the current file */
  onDelete: (e: React.MouseEvent) => void;
  /** Callback to replace the current file */
  onReplace: (e: React.MouseEvent) => void;
}

/**
 * Hover overlay for the Avatar variant.
 *
 * Appears on hover over the preview — semi-transparent backdrop
 * with "Delete" and "Replace" buttons centered vertically.
 *
 * Inherits `border-radius` from `.avatarWrapper` via `overflow: hidden`.
 */
export const AvatarOverlay = ({ onDelete, onReplace }: AvatarOverlayProps) => (
  <div className={styles.avatarOverlay}>
    <button
      type="button"
      className={styles.avatarOverlayBtn}
      onClick={onDelete}
      aria-label="Delete file"
    >
      Delete
    </button>
    <button
      type="button"
      className={styles.avatarOverlayBtn}
      onClick={onReplace}
      aria-label="Replace file"
    >
      Replace
    </button>
  </div>
);
