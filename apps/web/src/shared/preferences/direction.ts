/**
 * The document's reading direction.
 *
 * Nobody chooses a direction. It follows from language, and language selection
 * does not exist yet — stamping `lang="ar"` over English copy would be a claim
 * about the content rather than the layout, and assistive technology acts on
 * that claim. So this stamps direction alone, from one named default, and the
 * language that will eventually decide it arrives with translated content.
 *
 * It is stamped rather than assumed because the Design System resolves on it:
 * an icon that declares it mirrors is waiting for `dir` to exist, and a value
 * present in the document is what makes right-to-left something that can be
 * exercised rather than something taken on trust.
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
