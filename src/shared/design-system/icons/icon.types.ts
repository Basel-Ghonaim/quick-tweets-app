/**
 * The props every icon accepts, so any icon can replace another without
 * changing the call site.
 *
 * Colour is deliberately absent. An icon inherits `currentColor`, so its colour
 * is set by binding a token to `color` on an ancestor — which means an icon can
 * never be handed a raw value, and the token checker sees the binding because it
 * lives in CSS rather than in a prop.
 */
export interface IconProps {
  /** Icon width and height in pixels */
  size?: number;

  /** SVG stroke width */
  strokeWidth?: number;

  /** Additional CSS class for positioning or overrides */
  className?: string;
}

/** Default values applied to every icon */
export const ICON_DEFAULTS = {
  size: 24,
  strokeWidth: 2,
} as const;
