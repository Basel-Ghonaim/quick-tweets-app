import { directionOf } from "./language";

// The direction follows the language and is never chosen, so the two are stamped together: a
// document carrying one without the other reads in a direction its words do not.
export const applyLanguage = (language: string): void => {
  document.documentElement.setAttribute("lang", language);
  document.documentElement.setAttribute("dir", directionOf(language));
};
