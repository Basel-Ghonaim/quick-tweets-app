import {
  TrashIcon,
  PlusIcon,
  FileTypeIcon,
} from "../../../../../../icons";
import { formatSize } from "../../../formatSize";
import styles from "../../../FileInput.module.css";

interface FileListProps {
  files: File[];
  previews: string[];
  multiple: boolean;
  isAtCapacity: boolean;
  onRemove: (index: number, e: React.MouseEvent) => void;
  onAddMore: () => void;
}

/**
 * Bordered file list for general (non-image) mode.
 * Shows file type icon (or inline thumbnail for images),
 * name with ellipsis, size, and a trash button per row.
 * "Add more files" / "Replace file" row at the bottom.
 */
export const FileList = ({
  files,
  previews,
  multiple,
  isAtCapacity,
  onRemove,
  onAddMore,
}: FileListProps) => (
  <>
    {/* File rows */}
    {files.map((file, index) => {
      const isImage = file.type.startsWith("image/");

      return (
        <div key={`${file.name}-${index}`} className={styles.fileListRow}>
          {isImage ? (
            <img
              src={previews[index] ?? URL.createObjectURL(file)}
              alt={file.name}
              className={styles.fileListThumb}
            />
          ) : (
            <FileTypeIcon fileName={file.name} mimeType={file.type} size={18} />
          )}
          <span className={styles.fileListName}>{file.name}</span>
          <span className={styles.fileListSize}>{formatSize(file.size)}</span>
          <button
            type="button"
            className={styles.fileListRemoveBtn}
            onClick={(e) => onRemove(index, e)}
            aria-label={`Remove ${file.name}`}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      );
    })}

    {/* "Add more" / "Replace" row */}
    {!isAtCapacity && (
      <button
        type="button"
        className={styles.addMoreRow}
        onClick={onAddMore}
        aria-label="Add more files"
      >
        <PlusIcon size={16} />
        <span>{multiple ? "Add more files" : "Replace file"}</span>
      </button>
    )}
  </>
);
