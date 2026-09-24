import { forwardRef } from "react";
import styles from "./Skeleton.module.css";
import type { SkeletonProps, SkeletonShape } from "./Skeleton.types";
import { classNames } from "../../shared";

/** Written out rather than indexed by name, so the class-reference check can
 *  see all three. */
const SHAPE_CLASS: Record<SkeletonShape, string> = {
  block: styles.block,
  circle: styles.circle,
  line: styles.line,
};

export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ shape = "block", className, ...props }, ref) => (
    <span
      ref={ref}
      className={classNames(styles.root, SHAPE_CLASS[shape], className)}
      // Silent by construction: a page of these would otherwise announce a dozen
      // times over, and what is loading is the arrangement's to say.
      aria-hidden="true"
      {...props}
    />
  ),
);

Skeleton.displayName = "Skeleton";
