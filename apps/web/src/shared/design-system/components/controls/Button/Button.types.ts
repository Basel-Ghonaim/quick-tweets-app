import type { ReactNode } from "react";
import type { ControlProps, NativeProps } from "../../shared";

export type ButtonVariant = "contained" | "outlined" | "ghost";

/** What both arms look like. Appearance does not care which one it is. */
interface ButtonAppearance extends Omit<ControlProps, "isInvalid" | "isLoading"> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

/**
 * A Control, not a Field: it names itself, so it carries no label, no
 * description and no error of its own — which is why `isInvalid` is omitted.
 * Validity is a Field's: it is announced through a message the control is
 * described by, and an action has nowhere to put one.
 */
export interface ButtonActionProps extends ButtonAppearance, NativeProps<"button"> {
  href?: never;
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * The same appearance, navigating. Every prop an action has and a destination
 * cannot is refused here rather than ignored: a link has nothing to disable —
 * an anchor without `href` leaves the focus order it would announce into — it
 * submits no form, and it cannot be busy, because following it ends this page.
 */
export interface ButtonDestinationProps
  extends ButtonAppearance,
    Omit<NativeProps<"a">, "href"> {
  href: string;
  disabled?: never;
  type?: never;
  isLoading?: never;
  loadingText?: never;
}

export type ButtonProps = ButtonActionProps | ButtonDestinationProps;
