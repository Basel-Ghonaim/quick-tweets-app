import { TrashIcon, RefreshIcon } from "@shared/design-system/icons";
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
 * Appears on hover — semi-transparent backdrop with two circular
 * icon buttons (TrashIcon for delete, RefreshIcon for replace).
 *
 * Inherits `border-radius` from `.avatarWrapper` via `overflow: hidden`.
 */
export const AvatarOverlay = ({ onDelete, onReplace }: AvatarOverlayProps) => (
  <div className={styles.avatarOverlay}>
    <div className={styles.avatarOverlayActions}>
      <button
        type="button"
        className={`${styles.avatarOverlayBtn} ${styles.avatarOverlayBtnDanger}`}
        onClick={onDelete}
        aria-label="Delete file"
        title="Delete"
      >
        <TrashIcon size={16} />
      </button>
      <button
        type="button"
        className={styles.avatarOverlayBtn}
        onClick={onReplace}
        aria-label="Replace file"
        title="Replace"
      >
        <RefreshIcon size={16} />
      </button>
    </div>
  </div>
);
