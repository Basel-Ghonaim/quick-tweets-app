import { currentCatalogue, useCatalogue } from "@shared/localisation";
import { AUTH_COPY } from "./auth";
import { CONTROL_COPY } from "./controls";
import { ERROR_COPY } from "./errors";
import { PLACEHOLDER_COPY } from "./placeholder";
import { VALIDATION_MESSAGES } from "./validation";
import { ARABIC } from "./arabic";

const ENGLISH = {
  auth: AUTH_COPY,
  controls: CONTROL_COPY,
  errors: ERROR_COPY,
  placeholder: PLACEHOLDER_COPY,
  validation: VALIDATION_MESSAGES,
} as const;

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

export type Catalogue = Lines<typeof ENGLISH>;

// A catalogue assembled from constants escapes the excess-property check, so any line it has that
// English lacks is named here, at any depth, and the registry refuses it.
type ExtraLines<T, Shape> = T extends string | ((...args: never[]) => unknown)
  ? never
  : T extends readonly (infer E)[]
    ? ExtraLines<E, Shape extends readonly (infer S)[] ? S : never>
    : { [K in keyof T]-?: K extends keyof Shape ? ExtraLines<T[K], Shape[K]> : K }[keyof T];

type Refused<T> = {
  [L in keyof T]: [ExtraLines<T[L], Catalogue>] extends [never] ? unknown : { extraLine: ExtraLines<T[L], Catalogue> };
};

const registry = <T extends Record<string, Catalogue>>(catalogues: T & Refused<T>): T => catalogues;

/** One catalogue per language a reader can be given, keyed by its code. */
export const CATALOGUES = registry({ en: ENGLISH, ar: ARABIC });

/** The active language's words; the component renders again when the language changes. */
export const useCopy = (): Catalogue => useCatalogue<Catalogue>();

/** The active language's words, for code that is not a component; read them when they are needed. */
export const currentCopy = (): Catalogue => currentCatalogue<Catalogue>();
