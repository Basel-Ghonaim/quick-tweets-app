import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";
import mirror from "../../foundations/composition/iconMirror.module.css";
import { classNames } from "../../foundations/helpers";

/** The line climbs in the reading direction, so it changes hands with it. */
export const TrendingIcon = ({
  size = ICON_DEFAULTS.size,
  strokeWidth = ICON_DEFAULTS.strokeWidth,
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={classNames(mirror.mirrors, className)}
    aria-hidden="true"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
