import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { LanguageContext } from "./languageContext";
import { applyLanguage } from "./applyLanguage";
import { watchBrowserLanguages } from "./browserLanguages";
import {
  currentLanguage,
  refreshLanguage,
  registeredLanguages,
  setLanguage,
  subscribeToLanguage,
} from "./languageStore";

// The store keeps the language rather than this component, because code that is not a component
// reads it too: the words a failure reports itself in are resolved wherever the failure is met.
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const language = useSyncExternalStore(subscribeToLanguage, currentLanguage);

  useEffect(() => applyLanguage(language), [language]);

  // A reader who has chosen nothing follows the browser, as the theme follows the system.
  useEffect(() => watchBrowserLanguages(refreshLanguage), []);

  // The registered set is settled at bootstrap and never changes after it, so it is read rather
  // than subscribed to.
  const value = useMemo(
    () => ({ language, languages: registeredLanguages(), setLanguage }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};
