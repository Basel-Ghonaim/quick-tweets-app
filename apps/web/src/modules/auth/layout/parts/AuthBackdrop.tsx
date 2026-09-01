import { BrandMark } from "@shared/brand";
import styles from "./AuthBackdrop.module.css";

/** The ground the auth page stands on. Its geometry is feature-local: a page's
 *  brand treatment is not design language, because nothing else agrees with it. */
export const AuthBackdrop = () => (
  <div className={styles.root} aria-hidden="true">
    <div className={styles.light} />
    <BrandMark size={1000} className={styles.watermark} />
  </div>
);
