import { XIcon, PlusIcon } from "../../../../../../icons";
import { IconButton } from "../../../../../controls/IconButton";
import styles from "../../../FileInput.module.css";
import type { DropzoneFileInputContent } from "../../../FileInput.types";

interface ImageGridProps {
  content: Pick<DropzoneFileInputContent, "remove" | "addMoreImages" | "addMore">;
  files: File[];
  previews: string[];
  isAtCapacity: boolean;
  /** The field's availability, so a control the field disables is disabled. */
  disabled?: boolean;
  onRemove: (index: number, e: React.MouseEvent) => void;
  onAddMore: () => void;
}

/**
 * Thumbnail grid for image-only mode.
 * Each image has an X delete button on hover.
 * An "Add more" button sits as the last grid cell.
 */
export const ImageGrid = ({
  content,
  files,
  previews,
  isAtCapacity,
  disabled,
  onRemove,
  onAddMore,
}: ImageGridProps) => (
  <div className={styles.imageGrid}>
    {files.map((file, index) => (
      <div key={`thumb-${index}`} className={styles.thumbnailWrapper}>
        <img
          src={previews[index]}
          alt={file.name}
          className={styles.thumbnailImg}
        />
        <IconButton
          size="small"
          shape="circle"
          className={styles.thumbnailRemoveBtn}
          icon={<XIcon />}
          onClick={(e) => onRemove(index, e)}
          disabled={disabled}
          aria-label={content.remove(file.name)}
        />
      </div>
    ))}

    {/* "Add more" button — same size as thumbnails */}
    {!isAtCapacity && (
      <button
        type="button"
        className={styles.addMoreBtn}
        onClick={onAddMore}
        disabled={disabled}
        aria-label={content.addMoreImages}
      >
        <PlusIcon size={20} />
        <span>{content.addMore}</span>
      </button>
    )}
  </div>
);
