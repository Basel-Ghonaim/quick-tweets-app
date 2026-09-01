import type { ReactNode } from "react";
import styles from "./AuthCard.module.css";

/**
 * Hangs from a fixed block start rather than centring, so a screen with two
 * fields and one with six begin at the same line. Separated from the ground by
 * surface and a hairline: no elevation tier is earned to bind.
 */
export const AuthCard = ({ children }: { children: ReactNode }) => (
  <div className={styles.root}>{children}</div>
);
