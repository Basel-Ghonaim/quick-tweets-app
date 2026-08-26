import type { IconProps } from "../icon.types";
import { ICON_DEFAULTS } from "../icon.types";
import mirror from "../../foundations/composition/iconMirror.module.css";

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
    // Composed here rather than through the shared class-name helper: that
    // helper lives under `components/`, which already imports this directory,
    // and the return edge would leave two peer subsystems looking mutually
    // dependent for the sake of joining two strings.
    className={className ? `${mirror.mirrors} ${className}` : mirror.mirrors}
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
