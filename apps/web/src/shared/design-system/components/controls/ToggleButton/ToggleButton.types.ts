import type { ButtonActionProps } from "../Button/Button.types";
import type { IconButtonProps } from "../IconButton/IconButton.types";

/**
 * Controlled, always. Two of the three surfaces that want a toggle read their
 * state from a provider, and the third can hold its own and pass it down.
 */
interface PressedState {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

/**
 * Either anatomy, never both. `aria-pressed` is removed from each half because
 * it is this component's to report: a caller able to set it could contradict the
 * state it was given.
 */
export type ToggleButtonProps =
  | (PressedState &
      Omit<IconButtonProps, "aria-pressed"> & { children?: never })
  | (PressedState & Omit<ButtonActionProps, "aria-pressed"> & { icon?: never });
