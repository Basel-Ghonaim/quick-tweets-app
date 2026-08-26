/**
 * Direction is stamped alone, without a language. `lang` is a claim about what
 * the content *is*, which assistive technology acts on by choosing a voice, so
 * it may only be set where the content matches it.
 */
export const DIRECTIONS = ["ltr", "rtl"] as const;

export type Direction = (typeof DIRECTIONS)[number];

export const DIRECTION_ATTRIBUTE = "dir";

export const DEFAULT_DIRECTION: Direction = "ltr";

export const applyDirection = (
  direction: Direction = DEFAULT_DIRECTION,
): void => {
  document.documentElement.setAttribute(DIRECTION_ATTRIBUTE, direction);
};
