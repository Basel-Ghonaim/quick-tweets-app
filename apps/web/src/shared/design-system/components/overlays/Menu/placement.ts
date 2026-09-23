import type { MenuAlign, MenuSide } from "./Menu.types";

/** The gap between the trigger and the surface. Intrinsic geometry, not language. */
const OFFSET = 8;

/** Kept off the viewport's very edge, so a shifted surface never looks clipped. */
const MARGIN = 8;

export interface Placement {
  /** Distance from the top of the viewport. The block axis does not mirror. */
  blockStart: number;
  /** Distance from the edge the reader starts at, which is the right one in a
   *  right-to-left document — computed here so the stylesheet stays logical. */
  inlineStart: number;
  /** Where it actually went, which is not always where it was asked to go. */
  side: MenuSide;
}

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/**
 * Where the surface goes, measured rather than declared.
 *
 * Flips when the preferred side cannot hold it and the other can, and shifts
 * along the inline axis until it fits — a menu opened from the last row of a
 * feed, or from a trigger near the inline edge, is the ordinary case.
 */
export const place = (
  trigger: Box,
  surface: { width: number; height: number },
  viewport: { width: number; height: number },
  side: MenuSide,
  align: MenuAlign,
  rtl: boolean,
): Placement => {
  const fitsAfter = trigger.bottom + OFFSET + surface.height <= viewport.height - MARGIN;
  const fitsBefore = trigger.top - OFFSET - surface.height >= MARGIN;

  // Only flip when the other side is genuinely better: with neither fitting, the
  // preferred one is kept and the surface scrolls, rather than jumping about.
  const resolved: MenuSide =
    side === "block-end"
      ? fitsAfter || !fitsBefore
        ? "block-end"
        : "block-start"
      : fitsBefore || !fitsAfter
        ? "block-start"
        : "block-end";

  const blockStart =
    resolved === "block-end"
      ? trigger.bottom + OFFSET
      : trigger.top - OFFSET - surface.height;

  // Physical measurements become an inline offset here, so the stylesheet binds
  // one logical property and the mirroring is not written twice.
  const triggerInlineStart = rtl ? viewport.width - trigger.right : trigger.left;
  const triggerInlineEnd = triggerInlineStart + trigger.width;

  const preferred =
    align === "start" ? triggerInlineStart : triggerInlineEnd - surface.width;

  const furthest = viewport.width - MARGIN - surface.width;
  const inlineStart = Math.max(MARGIN, Math.min(preferred, Math.max(MARGIN, furthest)));

  return { blockStart, inlineStart, side: resolved };
};
