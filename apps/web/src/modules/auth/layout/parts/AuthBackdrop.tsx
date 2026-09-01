import { BrandMark } from "@shared/brand";
import { FeedTexture } from "./FeedTexture";
import styles from "./AuthBackdrop.module.css";

/** The ground the auth page stands on. Its geometry is feature-local: a page's
 *  brand treatment is not design language, because nothing else agrees with it. */
export const AuthBackdrop = () => (
  <div className={styles.root} aria-hidden="true">
    <FeedTexture />
    <div className={styles.light} />
    {/* Sized by the stylesheet, beside the light it has to move with. */}
    <BrandMark className={styles.watermark} />
  </div>
);
