import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";
import mirror from "../../foundations/composition/iconMirror.module.css";
import { classNames } from "../../foundations/helpers";

/** Previous sits behind the reader, and behind changes sides with the page. */
export const ChevronLeftIcon = ({
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
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
