import { forwardRef, useState } from "react";
import styles from "./Avatar.module.css";
import type { AvatarProps, AvatarSize } from "./Avatar.types";
import { classNames } from "../../shared";
import { UserIcon } from "../../../icons";

/** Written out rather than indexed by name: the class-reference check reads a
 *  literal member, and a dynamic index would leave these five unwatched. */
const SIZE_CLASS: Record<AvatarSize, string> = {
  small: styles.small,
  medium: styles.medium,
  large: styles.large,
  xlarge: styles.xlarge,
  xxlarge: styles.xxlarge,
};

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, alt, size = "medium", className, ...props }, ref) => {
    // The address that failed rather than a flag: a new `src` is no longer the
    // failed one, so it is tried without an effect having to clear the state.
    const [failed, setFailed] = useState<string>();

    return (
      <span
        ref={ref}
        className={classNames(styles.root, SIZE_CLASS[size], className)}
        {...props}
      >
        {src !== undefined && src !== failed ? (
          <img
            className={styles.image}
            src={src}
            alt={alt}
            onError={() => setFailed(src)}
          />
        ) : (
          // The icon hides itself, so a picture-less avatar announces nothing
          // and whatever names the person beside it keeps that job.
          <UserIcon className={styles.fallback} />
        )}
      </span>
    );
  },
);

Avatar.displayName = "Avatar";
