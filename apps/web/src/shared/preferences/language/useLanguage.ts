import { useSyncExternalStore } from "react";
import { currentLanguage, registeredLanguages, subscribeToLanguage } from "./languageStore";

/** The active language and the ones a reader can choose; renders again when the language changes. */
export const useLanguage = (): { language: string; languages: readonly string[] } => ({
  language: useSyncExternalStore(subscribeToLanguage, currentLanguage),
  languages: registeredLanguages(),
});
