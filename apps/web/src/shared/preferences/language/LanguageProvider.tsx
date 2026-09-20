import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { LanguageContext } from "./languageContext";
import {
  currentLanguage,
  registeredLanguages,
  setLanguage,
  subscribeToLanguage,
} from "./languageStore";

/**
 * The language a reader is given, published to the tree as the theme is.
 *
 * The store keeps it rather than this component, because code that is not a component reads it
 * too — the words an error reports itself in are resolved wherever the failure is met.
 */
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const language = useSyncExternalStore(subscribeToLanguage, currentLanguage);

  const value = useMemo(
    () => ({ language, languages: registeredLanguages(), setLanguage }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};
