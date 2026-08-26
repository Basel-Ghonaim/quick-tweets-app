import { Typography } from "@shared/design-system";
import { BrandMark } from "@shared/brand";
import styles from "./Placeholder.module.css";

export interface PlaceholderProps {
  /**
   * The surface a reader was heading for. Naming it is what makes the route
   * table an inventory of what is outstanding; without one this is a path that
   * matched nothing rather than a surface that is late.
   */
  surface?: string;
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
      {surface ? `${surface} is not built yet` : "There is nothing at this address"}
    </Typography>

    <Typography as="p" variant="body-medium" tone="secondary">
      {surface
        ? "It is part of the product and it is coming. This page is standing in until it does."
        : "The link may be mistyped, or it may point at something that was never here."}
    </Typography>
  </main>
);
