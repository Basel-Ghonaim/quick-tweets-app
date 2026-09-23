import type { ReactNode } from "react";

/**
 * `alert` interrupts to ask something that cannot wait, and is announced as such.
 * `fullscreen` is the form a phone gives a dialog that is really a page of work.
 */
export type DialogVariant = "modal" | "alert" | "fullscreen";

export interface DialogProps {
  /** The page owns when a dialog is open; this layer owns what that looks like. */
  open: boolean;

  /** Told whenever it closes, however it closed. */
  onClose: () => void;

  /** Its heading, which also names it. Required: an unnamed dialog announces
   *  nothing a reader can act on. */
  title: string;

  /** Rendered under the heading, and announced with it where present. */
  description?: string;

  /** The controls that resolve it. */
  actions?: ReactNode;

  /** Stacked where the surface is narrow or the question is heavy — the caller
   *  decides, because no width this layer can see tells it which. */
  actionsLayout?: "inline" | "stack";

  variant?: DialogVariant;

  children?: ReactNode;
}
