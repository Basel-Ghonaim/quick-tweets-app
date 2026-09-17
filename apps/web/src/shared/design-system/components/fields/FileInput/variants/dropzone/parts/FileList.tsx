import {
  TrashIcon,
  PlusIcon,
  FileTypeIcon,
} from "../../../../../../icons";
import { IconButton } from "../../../../../controls/IconButton";
import { formatSize } from "../../../formatSize";
import styles from "../../../FileInput.module.css";
import type { DropzoneFileInputContent } from "../../../FileInput.types";

interface FileListProps {
  content: Pick<DropzoneFileInputContent, "remove" | "addMoreFiles" | "replaceFile">;
  files: File[];
  previews: string[];
  multiple: boolean;
  isAtCapacity: boolean;
  /** The field's availability, so a control the field disables is disabled. */
  disabled?: boolean;
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
  content,
  files,
  previews,
  multiple,
  isAtCapacity,
  disabled,
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
          <IconButton
            size="small"
            className={styles.fileListRemoveBtn}
            icon={<TrashIcon />}
            onClick={(e) => onRemove(index, e)}
            disabled={disabled}
            aria-label={content.remove(file.name)}
          />
        </div>
      );
    })}

    {/* "Add more" / "Replace" row */}
    {!isAtCapacity && (
      <button
        type="button"
        className={styles.addMoreRow}
        onClick={onAddMore}
        disabled={disabled}
        aria-label={content.addMoreFiles}
      >
        <PlusIcon size={16} />
        <span>{multiple ? content.addMoreFiles : content.replaceFile}</span>
      </button>
    )}
  </>
);
