import { useEffect, useSyncExternalStore } from "react";
import { directionOf } from "./language";
import { currentLanguage, refreshLanguage, subscribeToLanguage } from "./languageStore";
import { watchBrowserLanguages } from "./browserLanguages";

/**
 * Keeps the document's `lang` and `dir` on the active language. The browser may change its languages
 * while the page is open, and a reader who has chosen none follows it, as the theme follows the system.
 */
export const useDocumentLanguage = (): void => {
  const language = useSyncExternalStore(subscribeToLanguage, currentLanguage);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", directionOf(language));
  }, [language]);

  useEffect(() => watchBrowserLanguages(refreshLanguage), []);
};
