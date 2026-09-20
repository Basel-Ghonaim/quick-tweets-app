import { createContext } from "react";

export interface LanguagePreference {
  language: string;
  /** The languages a reader can be given, in the order they were registered. */
  languages: readonly string[];
  setLanguage: (language: string) => void;
}

/** Undefined, so `useLanguage` can tell "no provider" from "a provider resolving to English". */
export const LanguageContext = createContext<LanguagePreference | undefined>(
  undefined,
);
