/**
 * Compose CSS Module class names, dropping the falsy branches a conditional
 * class produces. Every component hand-rolled this with slightly different
 * filtering; one implementation means a class list is composed the same way
 * everywhere and a component's class logic reads as data rather than plumbing.
 */
export const classNames = (
  ...values: Array<string | false | null | undefined>
): string => values.filter(Boolean).join(" ");
