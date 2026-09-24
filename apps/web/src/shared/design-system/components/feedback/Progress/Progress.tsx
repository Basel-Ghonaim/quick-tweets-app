import { forwardRef } from "react";
import styles from "./Progress.module.css";
import type { ProgressProps } from "./Progress.types";
import { classNames, customProperties } from "../../shared";
import { RING_RADIUS, fraction, ringDash } from "./geometry";

export const Progress = forwardRef<HTMLSpanElement, ProgressProps>(
  ({ value, max, shape = "linear", color, className, style, ...props }, ref) => (
    <span
      ref={ref}
      className={classNames(
        styles.root,
        shape === "ring" ? styles.ring : styles.linear,
        className,
      )}
      style={customProperties(
        color ? { "--progress-fill": `var(--role-fill-${color})` } : {},
        style,
      )}
      // Silent like the spinner: a fraction says neither what it measures nor
      // whether a reader should care, and the surface knows both.
      aria-hidden="true"
      {...props}
    >
      {shape === "ring" ? (
        <svg className={styles.ringBox} viewBox="0 0 24 24">
          <circle className={styles.track} cx="12" cy="12" r={RING_RADIUS} />
          <circle
            className={styles.fill}
            cx="12"
            cy="12"
            r={RING_RADIUS}
            strokeDasharray={ringDash(value, max)}
          />
        </svg>
      ) : (
        <span
          className={styles.bar}
          style={customProperties({
            "--progress-done": `${fraction(value, max) * 100}%`,
          })}
        />
      )}
    </span>
  ),
);

Progress.displayName = "Progress";
