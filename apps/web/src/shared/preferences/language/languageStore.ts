import { browserLanguages } from "./browserLanguages";
import { resolveLanguage } from "./language";
import { readStoredLanguage, writeStoredLanguage } from "./languageStorage";

// Held outside React, because code that is not a component — an error's default wording — reads it too.
let registered: readonly string[] = [];
let active: string | undefined;
// The reader's choice in this session, which holds even where storage cannot keep it.
let chosen: string | null = null;
const listeners = new Set<() => void>();

const resolveNow = () =>
  resolveLanguage({ stored: chosen ?? readStoredLanguage(), browser: browserLanguages(), registered });

const notify = () => listeners.forEach((listener) => listener());

/** Hands in the languages a catalogue exists for, and settles the active one among them. */
export const setupLanguages = (languages: readonly string[]): void => {
  registered = languages;
  chosen = null;
  active = resolveNow();
  notify();
};

/** Reads the reader's sources again; nothing is told unless the language actually changed. */
export const refreshLanguage = (): void => {
  const next = resolveNow();
  if (next === active) return;

  active = next;
  notify();
};

/** The reader's choice, which outranks the browser from now on and on later visits. */
export const setLanguage = (language: string): void => {
  if (!registered.includes(language))
    throw new Error(`"${language}" has no catalogue, so it cannot be chosen.`);

  chosen = language;
  writeStoredLanguage(language);
  refreshLanguage();
};

export const currentLanguage = (): string => {
  if (active === undefined) throw new Error("setupLanguages must run before the language is read.");
  return active;
};

/** The languages a reader can be given, in the order they were registered. */
export const registeredLanguages = (): readonly string[] => registered;

export const subscribeToLanguage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
