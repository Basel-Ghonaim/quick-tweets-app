import type { ENGLISH } from "./english";

// English's shape with its words widened: every language fills the same keys, and a line that takes
// values is handed the same ones. A translation may leave one unused; it cannot ask for another.
type Lines<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Lines<R>
    : T extends readonly (infer E)[]
      ? readonly Lines<E>[]
      : T extends object
        ? { readonly [K in keyof T]: Lines<T[K]> }
        : T;

/** The shape every catalogue has. It is English's, so a translation is read against the source. */
export type Catalogue = Lines<typeof ENGLISH>;
