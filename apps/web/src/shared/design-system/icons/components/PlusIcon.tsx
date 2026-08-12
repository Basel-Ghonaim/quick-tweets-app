import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";

/**
 * Plus (+) icon — used for "Add more" actions.
 */
export const PlusIcon = ({
  size = ICON_DEFAULTS.size,
  strokeWidth = ICON_DEFAULTS.strokeWidth,
  className,
}: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
