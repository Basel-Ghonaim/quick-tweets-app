import { BrandMark } from "@shared/brand";
import styles from "./AuthBackdrop.module.css";

/**
 * The ground the auth page stands on.
 *
 * Inert and hidden from assistive technology: it carries no information a
 * reader needs, and announcing a decorative field would put noise ahead of the
 * form. Its values are feature-local by the design direction's own rule — a
 * page's brand treatment is not design language, because nothing else must
 * agree with it — so the reason for each sits at the value rather than in a
 * token nothing else would bind.
 */
export const AuthBackdrop = () => (
  <div className={styles.root} aria-hidden="true">
    <div className={styles.light} />
    <BrandMark size={1000} className={styles.watermark} />
  </div>
);
