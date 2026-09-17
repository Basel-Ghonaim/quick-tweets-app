import type { ReactNode } from "react";
import type { FieldProps, NativeProps } from "../../shared";

export type InputVariant = "outlined" | "filled" | "underlined";

/**
 * A Field whose control is an Adorned Control: the affordances flanking it are
 * composed here, so a caller supplies a node per side and never a layout.
 */
interface InputBaseProps extends Omit<NativeProps<"input">, "type">, FieldProps {
  variant?: InputVariant;
  fullWidth?: boolean;
  /** Rendered before the control on the inline axis. */
  prefix?: ReactNode;
  /** Rendered after the control, alongside any affordance the field owns. */
  suffix?: ReactNode;
}

/** A password field composes a reveal toggle, so it cannot exist without that toggle's name. */
interface PasswordInputProps extends InputBaseProps {
  type: "password";
  revealLabel: string;
}

/** Listed rather than `string` minus "password", which TypeScript cannot express: any string
 *  would admit "password" and let a password field lose its toggle's name unnoticed. */
interface OtherInputProps extends InputBaseProps {
  type?: "text" | "email" | "number" | "search" | "tel" | "url";
  revealLabel?: never;
}

export type InputProps = PasswordInputProps | OtherInputProps;
