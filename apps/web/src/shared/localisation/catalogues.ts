import { useSyncExternalStore } from "react";
import { currentLanguage, setupLanguages, subscribeToLanguage } from "@shared/preferences";

// Handed in by the composition root and never imported: content travels into the platform
// (ADR 0018 Decision 6), so this knows a catalogue only as an object keyed by language.
let catalogues: Readonly<Record<string, object>> | undefined;

/** Registers one catalogue per language; those languages are the only ones a reader can be given. */
export const setupLocalisation = (next: Readonly<Record<string, object>>): void => {
  catalogues = next;
  setupLanguages(Object.keys(next));
};

const activeCatalogue = (): object => {
  if (!catalogues) throw new Error("setupLocalisation must run before a catalogue is read.");
  return catalogues[currentLanguage()];
};

/** The active language's catalogue, for code that is not a component; read it when the words are needed. */
export const currentCatalogue = <T>(): T => activeCatalogue() as T;

/** The active language's catalogue; the component renders again when the language changes. */
export const useCatalogue = <T>(): T => useSyncExternalStore(subscribeToLanguage, activeCatalogue) as T;
