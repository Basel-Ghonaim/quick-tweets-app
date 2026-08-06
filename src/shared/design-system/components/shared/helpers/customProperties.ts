import type { CSSProperties } from "react";

type CustomProperty = `--${string}`;

/**
 * Merge a component's own custom properties with the caller's `style`.
 *
 * `CSSProperties` admits no custom properties, so every component was widening
 * the type itself — six unchecked casts, none of which constrained the keys.
 * The cast happens once here and the key type does the constraining instead.
 *
 * Merging the caller's style is part of the signature rather than a convention
 * each component remembers: one of them forgot, and a caller's `style` was
 * silently dropped. The caller wins on collision, since a component's own
 * properties are its defaults.
 */
export const customProperties = (
  properties: Record<CustomProperty, string>,
  style?: CSSProperties,
): CSSProperties => ({ ...properties, ...style }) as CSSProperties;
