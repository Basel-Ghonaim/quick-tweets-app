import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";
import mirror from "../../foundations/composition/iconMirror.module.css";
import { classNames } from "../../foundations/helpers";

/** The handle points along the reading axis, so it changes side with it. */
export const SearchIcon = ({
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
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
