import type { ReactNode } from "react";
import type { ControlProps, NativeProps } from "../../shared";

export type ButtonVariant = "contained" | "outlined" | "ghost";

/**
 * A Control, not a Field: it names itself, so it carries no label, no
 * description and no error of its own — which is why `isInvalid` is omitted.
 * Validity is a Field's: it is announced through a message the control is
 * described by, and an action has nowhere to put one.
 */
export interface ButtonProps
  extends NativeProps<"button">,
    Omit<ControlProps, "isInvalid"> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loadingText?: string;
}
