import { Outlet } from "react-router-dom";
import { BrandMark } from "@shared/brand";
import { AUTH_COPY } from "../config/copy";
import { AuthBackdrop } from "./parts/AuthBackdrop";
import { BrandPanel } from "./parts/BrandPanel";
import { AuthCard } from "./parts/AuthCard";
import styles from "./AuthLayout.module.css";

/**
 * Everything the auth experience holds still.
 *
 * The ground, the mark, the brand panel and the card are the same on every
 * screen; only the card's body changes, and it arrives through the outlet. A
 * screen therefore composes into this rather than rebuilding it, which is what
 * keeps eight screens one composition instead of eight.
 *
 * The mark is decorative by its own contract, so the name it announces is put
 * on the element that wraps it — the layer's rule about a slotted node's
 * exposure, applied here rather than restated.
 */
export const AuthLayout = () => (
  <div className={styles.root}>
    <AuthBackdrop />

    <div className={styles.page}>
      <header className={styles.bar}>
        <span className={styles.lockup} role="img" aria-label={AUTH_COPY.brand.markLabel}>
          <BrandMark size={40} />
        </span>
      </header>

      <main className={styles.stage}>
        <BrandPanel />
        <AuthCard>
          <Outlet />
        </AuthCard>
      </main>
    </div>
  </div>
);
