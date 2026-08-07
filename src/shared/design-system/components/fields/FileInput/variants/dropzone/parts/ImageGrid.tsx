import { XIcon, PlusIcon } from "../../../../../../icons";
import styles from "../../../FileInput.module.css";

interface ImageGridProps {
  files: File[];
  previews: string[];
  isAtCapacity: boolean;
  onRemove: (index: number, e: React.MouseEvent) => void;
  onAddMore: () => void;
}

/**
 * Thumbnail grid for image-only mode.
 * Each image has an X delete button on hover.
 * An "Add more" button sits as the last grid cell.
 */
export const ImageGrid = ({
  files,
  previews,
  isAtCapacity,
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
        <button
          type="button"
          className={styles.thumbnailRemoveBtn}
          onClick={(e) => onRemove(index, e)}
          aria-label={`Remove ${file.name}`}
        >
          <XIcon size={12} />
        </button>
      </div>
    ))}

    {/* "Add more" button — same size as thumbnails */}
    {!isAtCapacity && (
      <button
        type="button"
        className={styles.addMoreBtn}
        onClick={onAddMore}
        aria-label="Add more images"
      >
        <PlusIcon size={20} />
        <span>Add more</span>
      </button>
    )}
  </div>
);
