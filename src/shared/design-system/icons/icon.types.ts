/**
 * Shared props interface for all icon components.
 *
 * Every icon in the design system accepts these props, ensuring
 * visual consistency and LSP compliance — any icon can replace
 * another without breaking the consumer API.
 */
export interface IconProps {
  /** Icon width and height in pixels */
  size?: number;

  /** Icon color — defaults to "currentColor" (inherits parent text color) */
  color?: string;

  /** SVG stroke width */
  strokeWidth?: number;

  /** Additional CSS class for positioning or overrides */
  className?: string;
}

/** Default values applied to every icon */
export const ICON_DEFAULTS = {
  size: 24,
  color: "currentColor",
  strokeWidth: 2,
} as const;
