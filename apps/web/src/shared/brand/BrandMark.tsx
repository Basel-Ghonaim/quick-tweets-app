export interface BrandMarkProps {
  /** Width and height in pixels. */
  size?: number;
  className?: string;
}

/**
 * The product's mark. It fills with `currentColor`, so its colour is whatever
 * the surrounding text is set to and it can never be handed a raw value.
 *
 * It does not take `IconProps`. That contract carries a stroke width, which a
 * filled glyph has no use for, and a component that cannot keep a shared
 * contract does not claim it.
 *
 * Decorative by default: it is a picture of the product's name, so a caller
 * that needs it announced puts the name on whatever wraps it — a link, a
 * heading — rather than on the glyph.
 *
 * The same three paths are in public/favicon.svg, which is fetched as a file
 * and cannot inherit a colour. Change one and change the other.
 */
export const BrandMark = ({ size = 32, className }: BrandMarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="279 219 460 460"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path
      fillRule="evenodd"
      d="M298 455a215 215 0 1 0 430 0 215 215 0 1 0-430 0ZM381 455a132 132 0 1 0 264 0 132 132 0 1 0-264 0Z"
    />
    <path d="M593.11 468.89 706.96 582.73a44 44 0 0 1-62.23 62.23L530.89 531.11Z" />
    <path d="M518 355 457 472h43l-10 80 66-119h-44Z" />
  </svg>
);
