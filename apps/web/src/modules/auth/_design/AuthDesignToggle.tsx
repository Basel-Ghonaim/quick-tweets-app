import { useAuthDesignMode } from "./useAuthDesignMode";
import type { AuthDesignMode } from "./authDesignMode";
import styles from "./AuthDesignToggle.module.css";

/**
 * Fixed display order, independent of which mode is active.
 *
 * A segmented control whose segments swap places as it is used is disorienting:
 * the reader has to re-find the option rather than aim at a known position. So
 * the order is declared here rather than derived from the current mode, and the
 * active segment is marked by appearance instead of by position.
 */
const SEGMENTS: readonly AuthDesignMode[] = ["proposed", "bootstrap"];

/**
 * The primary control for switching designs.
 *
 * The mode itself lives in the URL, so this is a convenience over the address
 * bar rather than the source of truth. That is what allows two tabs to hold
 * different modes at the same time.
 */
export const AuthDesignToggle = () => {
  const { mode, setMode } = useAuthDesignMode();

  return (
    <div
      className={styles.root}
      data-testid="auth-design-toggle"
      role="group"
      aria-label="Auth design mode"
    >
      {SEGMENTS.map((segment) => {
        const isActive = segment === mode;

        return (
          <button
            key={segment}
            type="button"
            className={isActive ? styles.segmentActive : styles.segment}
            onClick={() => setMode(segment)}
            aria-pressed={isActive}
            /*
             * The identifiers name the role a segment is playing rather than
             * the mode it carries, so a test can click "the one that switches"
             * without knowing which mode is active.
             */
            data-testid={isActive ? "auth-design-current" : "auth-design-switch"}
          >
            {segment}
          </button>
        );
      })}
    </div>
  );
};
