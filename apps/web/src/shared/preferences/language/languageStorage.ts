import { storedChoice } from "../storage";

// Which languages exist is settled at registration, so a stored value is read against the
// registered set rather than here.
const stored = storedChoice("language");

/** The stored choice, or `null` when none was made or storage is unreadable. */
export const readStoredLanguage = (): string | null => stored.read();

/** Keeps the reader's choice for later visits, where storage can. */
export const writeStoredLanguage = (language: string): void => stored.write(language);
