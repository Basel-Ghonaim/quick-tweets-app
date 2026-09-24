import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";
import mirror from "../../foundations/composition/iconMirror.module.css";
import { classNames } from "../../foundations/helpers";

/** Next sits ahead of the reader, and ahead changes sides with the page. */
export const ChevronRightIcon = ({
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
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
