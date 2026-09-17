import { CameraIcon, UserIcon } from "../../../../../../icons";
import styles from "../../../FileInput.module.css";
import type { AvatarFileInputContent, AvatarFill } from "../../../FileInput.types";

interface AvatarEmptyProps {
  /** Background style — determines icon and text */
  fill: AvatarFill;
  content: Pick<AvatarFileInputContent, "upload" | "uploadCompact">;
}

/**
 * Empty state content for the Avatar variant.
 *
 * - **default**: CameraIcon + the upload prompt
 * - **outline**: UserIcon (profile silhouette) + the compact prompt
 */
export const AvatarEmpty = ({ fill, content }: AvatarEmptyProps) => {
  if (fill === "outline") {
    return (
      <>
        <UserIcon size={32} />
        <span className={styles.avatarText}>{content.uploadCompact}</span>
      </>
    );
  }

  return (
    <>
      <CameraIcon size={24} />
      <span className={styles.avatarText}>{content.upload}</span>
    </>
  );
};
