import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "../../../../icons";
import { ToggleButton } from "../../../controls/ToggleButton";

interface PasswordToggleProps {
  /** Its accessible name, which stays fixed while `aria-pressed` reports the state. */
  label: string;
  /** The id of the control whose visibility this toggles, for `aria-controls`. */
  controlId: string;
  disabled?: boolean;
  className?: string;
  onToggle: (isVisible: boolean) => void;
}

/**
 * Reveals or hides a password field's value.
 *
 * It owns the visibility state and reports it upward, rather than the field
 * holding state that belongs to a control nested inside it. The field decides
 * what the state means for the input's `type`; this decides only whether the
 * value is shown.
 */
export const PasswordToggle = ({
  label,
  controlId,
  disabled,
  className,
  onToggle,
}: PasswordToggleProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = (next: boolean) => {
    setIsVisible(next);
    onToggle(next);
  };

  return (
    <ToggleButton
      className={className}
      color="primary"
      size="small"
      icon={isVisible ? <EyeOffIcon /> : <EyeIcon />}
      pressed={isVisible}
      onPressedChange={toggle}
      disabled={disabled}
      aria-controls={controlId}
      /* Fixed, because the pressed state already reports which way it is: a name
         that changed too would announce the same fact twice, in two vocabularies. */
      aria-label={label}
    />
  );
};
