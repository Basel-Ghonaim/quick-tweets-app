import { TrashIcon, RefreshIcon } from "../../../../../../icons";
import { IconButton } from "../../../../../controls/IconButton";
import { classNames } from "../../../../../shared";
import styles from "../../../FileInput.module.css";

interface AvatarOverlayProps {
  /** Callback to delete the current file */
  onDelete: (e: React.MouseEvent) => void;
  /** Callback to replace the current file */
  onReplace: (e: React.MouseEvent) => void;
  /** The field's availability, so a control the field disables is disabled. */
  disabled?: boolean;
}

/**
 * Hover overlay for the Avatar variant.
 *
 * Appears on hover — semi-transparent backdrop with two circular
 * icon buttons (TrashIcon for delete, RefreshIcon for replace).
 *
 * Inherits `border-radius` from `.avatarWrapper` via `overflow: hidden`.
 */
export const AvatarOverlay = ({
  onDelete,
  onReplace,
  disabled,
}: AvatarOverlayProps) => (
  <div className={styles.avatarOverlay}>
    <div className={styles.avatarOverlayActions}>
      <IconButton
        shape="circle"
        className={classNames(
          styles.avatarOverlayBtn,
          styles.avatarOverlayBtnDanger,
        )}
        icon={<TrashIcon />}
        onClick={onDelete}
        disabled={disabled}
        aria-label="Delete file"
        title="Delete"
      />
      <IconButton
        shape="circle"
        className={styles.avatarOverlayBtn}
        icon={<RefreshIcon />}
        onClick={onReplace}
        disabled={disabled}
        aria-label="Replace file"
        title="Replace"
      />
    </div>
  </div>
);
