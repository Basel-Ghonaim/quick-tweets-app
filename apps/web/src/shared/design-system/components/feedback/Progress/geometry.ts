/** The radius the ring is drawn at, inside a 24-unit box. Intrinsic geometry. */
export const RING_RADIUS = 9;

const circumference = (radius: number) => 2 * Math.PI * radius;

/**
 * How much of the whole is done, between none and all of it.
 *
 * Clamped at both ends: a value past its maximum means the thing being measured
 * has overrun, which is the consumer's to say in words — the indicator showing
 * more than a full circle would say something geometry cannot mean. A maximum of
 * nothing is not a scale, so nothing is done.
 */
export const fraction = (value: number, max: number): number => {
  if (!(max > 0)) return 0;
  return Math.min(Math.max(value / max, 0), 1);
};

/**
 * A ring's `stroke-dasharray`: the length drawn, then the whole way round. The
 * rest of the circle stays undrawn, which is what leaves the track showing.
 */
export const ringDash = (
  value: number,
  max: number,
  radius: number = RING_RADIUS,
): string => {
  const whole = circumference(radius);
  return `${(fraction(value, max) * whole).toFixed(1)} ${whole.toFixed(1)}`;
};
