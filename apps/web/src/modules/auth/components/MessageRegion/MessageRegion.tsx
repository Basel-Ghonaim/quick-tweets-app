import type { ReactNode } from "react";
import { Typography } from "@shared/design-system";
import styles from "./MessageRegion.module.css";

/** Widens as screens need it; one entry is today's only interruption, not a
 *  decision that there will only ever be one. */
export type MessageTone = "error";

interface MessageRegionProps {
  tone: MessageTone;
  children: ReactNode;
}

/**
 * Where a flow speaks about itself rather than about one field.
 *
 * A `-subtle` fill is a tenth-alpha wash, so the pair it forms is a composite
 * `tokenContrast` cannot measure — the contrast that makes this one safe is
 * asserted by the rendered accessibility run instead (Finding 0022).
 */
export const MessageRegion = ({ tone, children }: MessageRegionProps) => (
  <div className={`${styles.root} ${styles[tone]}`} role="alert">
    <Typography variant="body-small">{children}</Typography>
  </div>
);
