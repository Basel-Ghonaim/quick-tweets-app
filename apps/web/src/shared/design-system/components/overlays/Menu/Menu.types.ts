import type { ReactElement, ReactNode } from "react";
import type { ControlProps, NativeProps } from "../../shared";

/** Which side of the trigger the surface prefers. It flips to the other when the
 *  preferred one cannot hold it. */
export type MenuSide = "block-end" | "block-start";

/** Which of the trigger's inline edges the surface lines up with. */
export type MenuAlign = "start" | "end";

export interface MenuProps {
  /** The control that opens it. Menu wires the disclosure attributes onto this
   *  element, so a caller never states them and they cannot fall out of step. */
  trigger: ReactElement;

  /** What the menu is called. Required: a menu with no name announces nothing. */
  label: string;

  /** `MenuItem`s, and whatever separates them. */
  children: ReactNode;

  side?: MenuSide;
  align?: MenuAlign;

  /** Told after the surface closes, whatever closed it. */
  onClose?: () => void;
}

/**
 * An item is a command by default. Give it `checked` and it becomes a choice
 * that reports its state, which is a different thing to announce — so the prop's
 * presence, not a variant name, is what selects between them.
 */
export type MenuItemProps = Omit<NativeProps<"button">, "type"> &
  Pick<ControlProps, "color"> & {
    /** Drawn before the label. Hidden or announced by whoever supplies it. */
    icon?: ReactNode;
    checked?: boolean;
  };
