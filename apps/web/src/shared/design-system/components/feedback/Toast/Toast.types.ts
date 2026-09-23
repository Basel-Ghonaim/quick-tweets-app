import type { ReactNode } from "react";
import type { ControlProps, NativeProps } from "../../shared";

interface ToastBase extends NativeProps<"div">, Pick<ControlProps, "color"> {
  /** Drawn before the message and coloured by `color`. Which glyph it is belongs
   *  to the caller, as does whether it announces anything. */
  icon?: ReactNode;

  /** One thing a reader may do about it — usually a link to what just happened. */
  action?: ReactNode;
}

/** A dismiss control cannot exist without a word for it, so the two arrive
 *  together or not at all. */
export type ToastProps =
  | (ToastBase & { onDismiss: () => void; dismissLabel: string })
  | (ToastBase & { onDismiss?: never; dismissLabel?: never });
