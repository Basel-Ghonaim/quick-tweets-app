import type { ReactNode } from "react";
import type { ControlProps, NativeProps } from "../../shared";

/** Kept local: identical to Button's set today, but the two are separate components. */
export type IconButtonVariant = "contained" | "outlined" | "ghost";

export type IconButtonShape = "circle" | "rounded";

/**
 * A Control that carries no visible text, so its accessible name is **required**
 * rather than optional — an unnamed icon button is unusable, and nothing else in
 * the layer would catch it. The name arrives through the native attribute rather
 * than a prop of our own, so there is only ever one spelling of it.
 */
export interface IconButtonProps
  extends Omit<NativeProps<"button">, "aria-label">,
    Omit<ControlProps, "isInvalid"> {
  /** The icon element. Sized by this component, coloured by inheritance. */
  icon: ReactNode;
  variant?: IconButtonVariant;
  shape?: IconButtonShape;
  "aria-label": string;
}
