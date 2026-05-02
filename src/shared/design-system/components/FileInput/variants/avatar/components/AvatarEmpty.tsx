import { CameraIcon, UserIcon } from "@shared/design-system/icons";
import styles from "../../../FileInput.module.css";
import type { AvatarFill } from "../../../FileInput.types";

interface AvatarEmptyProps {
  /** Background style — determines icon and text */
  fill: AvatarFill;
}

/**
 * Empty state content for the Avatar variant.
 *
 * - **default**: CameraIcon + "Upload media" — prompts the user to upload
 * - **outline**: UserIcon (profile silhouette) + "Upload" — pre-styled placeholder
 */
export const AvatarEmpty = ({ fill }: AvatarEmptyProps) => {
  if (fill === "outline") {
    return (
      <>
        <UserIcon size={32} />
        <span className={styles.avatarText}>Upload</span>
      </>
    );
  }

  return (
    <>
      <CameraIcon size={24} />
      <span className={styles.avatarText}>Upload media</span>
    </>
  );
};
