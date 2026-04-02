import type { ComponentPropsWithRef, ReactNode } from "react";

export type ButtonVariant = "contained" | "outlined" | "ghost";
export type ButtonState =  "active" | "loading" | "disabled";
export type ButtonColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  state?: ButtonState;
  color?: ButtonColor;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loadingText?: string;
}
