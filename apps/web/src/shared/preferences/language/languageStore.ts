import { browserLanguages } from "./browserLanguages";
import { resolveLanguage } from "./language";
import { readStoredLanguage } from "./languageStorage";

// Held outside React, because code that is not a component — an error's default wording — reads it too.
let registered: readonly string[] = [];
let active: string | undefined;
const listeners = new Set<() => void>();

const resolveNow = () =>
  resolveLanguage({ stored: readStoredLanguage(), browser: browserLanguages(), registered });

const notify = () => listeners.forEach((listener) => listener());

/** Hands in the languages a catalogue exists for, and settles the active one among them. */
export const setupLanguages = (languages: readonly string[]): void => {
  registered = languages;
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

export const currentLanguage = (): string => {
  if (active === undefined) throw new Error("setupLanguages must run before the language is read.");
  return active;
};

export const subscribeToLanguage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
