import { Outlet } from "react-router-dom";
import { BrandMark } from "@shared/brand";
import { useCopy } from "@shared/copy";
import { AuthBackdrop } from "./parts/AuthBackdrop";
import { BrandPanel } from "./parts/BrandPanel";
import { AuthCard } from "./parts/AuthCard";
import { LanguageToggle } from "./parts/LanguageToggle";
import { ThemeToggle } from "./parts/ThemeToggle";
import styles from "./AuthLayout.module.css";

/**
 * Everything the auth experience holds still. Only the card's body changes, and
 * it arrives through the outlet.
 */
export const AuthLayout = () => {
  const copy = useCopy();

  return (
    <div className={styles.root}>
      <AuthBackdrop />

      <div className={styles.page}>
        <header className={styles.bar}>
          {/* The mark is decorative by its own contract, so the name goes on the wrapper. */}
          <span className={styles.lockup} role="img" aria-label={copy.auth.brand.markLabel}>
            <BrandMark size={40} />
          </span>

          <div className={styles.controls}>
            <LanguageToggle />
            <ThemeToggle />
          </div>
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
};
