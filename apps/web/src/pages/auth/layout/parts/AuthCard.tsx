import type { ReactNode } from "react";
import { Typography } from "@shared/design-system";
import { BrandMark } from "@shared/brand";
import { AUTH_COPY } from "@shared/copy";
import styles from "./AuthCard.module.css";

/**
 * Hangs from a fixed block start rather than centring, so a screen with two
 * fields and one with six begin at the same line. Separated from the ground by
 * surface and a hairline: no elevation tier is earned to bind.
 *
 * It signs itself. The mark identifies the card rather than any one screen, so
 * a screen cannot forget it and giving it a prop later reaches one file.
 */
export const AuthCard = ({ children }: { children: ReactNode }) => (
  <div className={styles.root}>
    {children}

    <div className={styles.signature}>
      <BrandMark size={16} />
      <Typography variant="body-small" tone="muted">
        {AUTH_COPY.brand.markLabel}
      </Typography>
    </div>
  </div>
);
