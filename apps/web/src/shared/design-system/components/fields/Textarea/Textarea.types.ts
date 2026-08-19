import type { FieldProps, NativeProps } from "../../shared";

/**
 * `plain` carries no boundary of its own: the surface composing it owns that,
 * which is what a composer needs. `outlined` is the conventional form field.
 */
export type TextareaVariant = "plain" | "outlined";

export type TextareaResize = "none" | "vertical";

/**
 * A Field whose control is a native textarea. `isLoading` is omitted because a
 * multiline field has nowhere to put a busy indicator that a caller has not
 * already filled with text.
 */
interface TextareaBase
  extends Omit<NativeProps<"textarea">, "ref">,
    Omit<FieldProps, "isLoading"> {
  variant?: TextareaVariant;
  fullWidth?: boolean;
}

/**
 * Growing with the content and being dragged by a handle are two answers to the
 * same question, and a control doing both fights its user. Split so the pair
 * cannot be expressed rather than merely discouraged: `maxRows` belongs only to
 * the growing one, and `resize` only to the other.
 */
export type TextareaProps =
  | (TextareaBase & {
      autoResize: true;
      /** The height at which growth stops and the control scrolls. */
      maxRows?: number;
      resize?: never;
    })
  | (TextareaBase & {
      autoResize?: false;
      maxRows?: never;
      resize?: TextareaResize;
    });
