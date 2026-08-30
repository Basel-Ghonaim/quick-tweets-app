import { forwardRef, type MouseEvent } from "react";
import styles from "./ToggleButton.module.css";
import type { ToggleButtonProps } from "./ToggleButton.types";
import type { ButtonProps } from "../Button/Button.types";
import type { IconButtonProps } from "../IconButton/IconButton.types";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { classNames } from "../../shared";

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ pressed, onPressedChange, variant, onClick, className, ...props }, ref) => {
    const shared = {
      ref,
      "aria-pressed": pressed,
      // Pressed is the filled treatment rather than a colour of its own, so it
      // arrives as the variant and brings every guarantee `contained` carries.
      // Unpressed passes `undefined` through, leaving each delegate its default.
      variant: pressed ? ("contained" as const) : variant,
      className: classNames(pressed && styles.pressed, className),
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        onPressedChange(!pressed);
      },
    };

    // The union is discriminated for the caller, and delegating collapses it: each
    // half wants its own props type while this component publishes one. Widened
    // here rather than at the call site, which is where the restriction works.
    return "icon" in props ? (
      <IconButton {...(props as IconButtonProps)} {...shared} />
    ) : (
      <Button {...(props as ButtonProps)} {...shared} />
    );
  },
);

ToggleButton.displayName = "ToggleButton";
