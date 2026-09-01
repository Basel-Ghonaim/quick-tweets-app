import type { ReactNode } from "react";
import styles from "./AuthCard.module.css";

/**
 * The surface every auth screen renders into.
 *
 * It is separated from the ground by surface and a hairline rather than by
 * elevation: the design direction keeps the register unceremonious, and the
 * token layer earns no elevation tier to bind even where one were wanted.
 *
 * It hangs from a fixed block start rather than centring, so a screen with two
 * fields and a screen with six begin at the same line and the reader never has
 * to find the title again.
 */
export const AuthCard = ({ children }: { children: ReactNode }) => (
  <div className={styles.root}>{children}</div>
);
