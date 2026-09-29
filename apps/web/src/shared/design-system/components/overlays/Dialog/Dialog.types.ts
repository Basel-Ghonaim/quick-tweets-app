import type { ReactNode } from "react";

/**
 * `alert` interrupts to ask something that cannot wait, and is announced as such.
 * `fullscreen` is the form a phone gives a dialog that is really a page of work.
 */
export type DialogVariant = "modal" | "alert" | "fullscreen";

interface DialogBase {
  /** The page owns when a dialog is open; this layer owns what that looks like. */
  open: boolean;

  /** Told whenever it closes, however it closed. */
  onClose: () => void;

  /** Its heading, which also names it. Required: an unnamed dialog announces
   *  nothing a reader can act on. */
  title: string;

  /** Rendered under the heading, and announced with it where present. */
  description?: string;

  children?: ReactNode;
}

interface ActionsBelow {
  /** The controls that resolve it. */
  actions?: ReactNode;

  /** Stacked where the surface is narrow or the question is heavy — the caller
   *  decides, because no width this layer can see tells it which. */
  actionsLayout?: "inline" | "stack";

  action?: never;
}

/** A bar has room for one action beside the way out, and no row beneath it. */
interface ActionInTheBar {
  action?: ReactNode;
  actions?: never;
  actionsLayout?: never;
}

/** The head's way out reports rather than closes: leaving may first need a
 *  question only the page can ask. It cannot exist without its word. */
type Dismissal =
  | { onDismiss: () => void; dismissLabel: string }
  | { onDismiss?: never; dismissLabel?: never };

type NoDismissal = { onDismiss?: never; dismissLabel?: never };

export type DialogProps = DialogBase &
  (
    | ({ variant?: "modal" } & ActionsBelow & Dismissal)
    // A question that cannot wait is left by answering it.
    | ({ variant: "alert" } & ActionsBelow & NoDismissal)
    | ({ variant: "fullscreen" } & ActionInTheBar & Dismissal)
  );
