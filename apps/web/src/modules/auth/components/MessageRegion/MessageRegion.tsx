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
 * It carries no fill. The direction's recipe pairs a role's `-subtle` fill with
 * `--role-on-surface-<role>` text, but every `-subtle` fill is a tenth-alpha
 * overlay, so the pair's real value depends on what is behind it and no check
 * ever measures it — composited, `error` reaches 3.98:1 against a 4.5 floor.
 * On the card's own surface the same text is a pair `tokenContrast` already
 * guarantees, and separation by surface and border is what §7 asks for anyway.
 */
export const MessageRegion = ({ tone, children }: MessageRegionProps) => (
  <div className={`${styles.root} ${styles[tone]}`} role="alert">
    <Typography variant="body-small">{children}</Typography>
  </div>
);
