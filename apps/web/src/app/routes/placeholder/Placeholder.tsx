import { Typography } from "@shared/design-system";
import { BrandMark } from "@shared/brand";
import { PLACEHOLDER_COPY } from "@shared/copy";
import styles from "./Placeholder.module.css";

export interface PlaceholderProps {
  /**
   * The surface a reader was heading for. Naming it is what makes the route
   * table an inventory of what is outstanding; without one this is a path that
   * matched nothing rather than a surface that is late.
   */
  surface?: keyof typeof PLACEHOLDER_COPY.notBuiltTitle;
}

/**
 * Where a control points while its real destination does not exist.
 *
 * Every entry goes when its surface is built — that condition is the whole
 * schedule, and the route table is where it is read.
 */
export const Placeholder = ({ surface }: PlaceholderProps) => (
  <main className={styles.root}>
    <BrandMark size={40} className={styles.mark} />

    <Typography as="h1" variant="heading-large">
      {surface ? PLACEHOLDER_COPY.notBuiltTitle[surface] : PLACEHOLDER_COPY.unknownTitle}
    </Typography>

    <Typography as="p" variant="body-medium" tone="secondary">
      {surface ? PLACEHOLDER_COPY.notBuiltBody : PLACEHOLDER_COPY.unknownBody}
    </Typography>
  </main>
);
