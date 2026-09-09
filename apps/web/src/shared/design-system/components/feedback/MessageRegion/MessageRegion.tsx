import type { ReactNode } from "react";
import { Typography } from "../../display/Typography";
import styles from "./MessageRegion.module.css";

/** Widens as screens need it; these two are today's interruptions, not a
 *  decision that there will only ever be two. */
export type MessageTone = "error" | "info";

/** A failure interrupts; a confirmation waits its turn. Both are announced. */
const LIVE_ROLE: Record<MessageTone, "alert" | "status"> = {
  error: "alert",
  info: "status",
};

interface MessageRegionProps {
  tone: MessageTone;
  children: ReactNode;
}

/** Its fill is a tenth-alpha wash, so the pair is a composite no token check
 *  measures — the rendered accessibility run does (Finding 0022). */
export const MessageRegion = ({ tone, children }: MessageRegionProps) => (
  <div className={`${styles.root} ${styles[tone]}`} role={LIVE_ROLE[tone]}>
    <Typography variant="body-small">{children}</Typography>
  </div>
);
