import type { ComponentPropsWithRef, ElementType } from "react";
import type { ControlSize, Role } from "../../foundations";

/**
 * Native attributes the control vocabulary shadows. `size` is an integer width
 * on an input, `color` is a legacy presentational attribute, and `prefix` is an
 * RDFa attribute no control uses but the adornment anatomy names. All three are
 * omitted once here rather than per component, which is how the layer ended up
 * with three spellings of one size prop.
 */
type ShadowedNativeAttributes = "size" | "color" | "prefix";

/** The native surface of the element a control wraps, minus what it shadows. */
export type NativeProps<E extends ElementType> = Omit<
  ComponentPropsWithRef<E>,
  ShadowedNativeAttributes
>;

/**
 * What every control accepts.
 *
 * `disabled` is deliberately absent: it belongs to the element, arrives through
 * `NativeProps`, and a second declaration here would be the two-spellings
 * problem re-created. The prop is named `color` rather than `role` because
 * `role` is a live ARIA attribute on every element.
 */
export interface ControlProps {
  color?: Role;
  size?: ControlSize;
  isInvalid?: boolean;
  /**
   * An operation is in flight, and what that costs depends on the anatomy.
   *
   * A **Control** is also unavailable: it takes the native `disabled`, and
   * recovering focus afterwards belongs to the surface that started the
   * operation, since only that surface knows where focus should land next.
   *
   * A **Field** stays usable — `Input` shows the indicator and keeps accepting
   * input, because a field disabled mid-validation drops its value from the
   * form it is part of. It is the deliberate exception, not an oversight.
   *
   * Both say so with `aria-busy`, which is the only part `disabled` cannot
   * express.
   */
  isLoading?: boolean;
}

/**
 * What a control accepts once it is labelled and can describe itself — the
 * Field half of the anatomy. A Control that is not a Field (an action, say)
 * takes `ControlProps` alone and owns no label or message.
 */
export interface FieldProps extends ControlProps {
  label?: string;
  errorMessage?: string;
  helperText?: string;
}
