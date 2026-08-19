import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "../../../../icons";
import { IconButton } from "../../../controls/IconButton";

interface PasswordToggleProps {
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
  controlId,
  disabled,
  className,
  onToggle,
}: PasswordToggleProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => {
    const next = !isVisible;
    setIsVisible(next);
    onToggle(next);
  };

  return (
    <IconButton
      className={className}
      color="primary"
      size="small"
      icon={isVisible ? <EyeOffIcon /> : <EyeIcon />}
      onClick={toggle}
      disabled={disabled}
      aria-controls={controlId}
      aria-pressed={isVisible}
      aria-label={isVisible ? "Hide password" : "Show password"}
    />
  );
};
