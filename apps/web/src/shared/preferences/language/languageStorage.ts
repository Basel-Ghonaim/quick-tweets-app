// A bare string, as the theme's is: the pre-paint script cannot import this module and must read the
// value in one line (Finding 0018). Guarded, because storage throws outright in some privacy modes.
const LANGUAGE_STORAGE_KEY = "quick-tweets:language";

/** The stored choice, or `null` when none was made or storage is unreadable. */
export const readStoredLanguage = (): string | null => {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

/** Keeps the reader's choice for later visits, where storage can. */
export const writeStoredLanguage = (language: string): void => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* The session still holds the choice; only a later visit loses it. */
  }
};
