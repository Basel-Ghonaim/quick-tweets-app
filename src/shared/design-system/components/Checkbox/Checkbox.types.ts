import type { FieldProps, NativeProps } from "../shared";

/**
 * A Field whose control is a native checkbox. `type` is omitted because the
 * component fixes it — a caller changing it would change what the component is.
 */
export interface CheckboxProps
  extends Omit<NativeProps<"input">, "type">,
    Omit<FieldProps, "isLoading"> {
  /** Text label rendered beside the control. */
  label: string;
}
