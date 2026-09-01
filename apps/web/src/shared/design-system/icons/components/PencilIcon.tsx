import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";

export const PencilIcon = ({
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
    className={className}
    aria-hidden="true"
  >
    <path d="M4 19.5h4L20 8l-4-4L4 15.5v4Z" />
    <path d="m14 6 4 4" />
  </svg>
);
