import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";

/**
 * Refresh / Replace icon — two circular arrows.
 * Used for "Replace file" actions.
 */
export const RefreshIcon = ({
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
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);
