/** The browser's languages in its order of preference; a browser that lists none still reports one. */
export const browserLanguages = (): readonly string[] =>
  navigator.languages?.length ? navigator.languages : [navigator.language];

/** Calls back while the browser's languages change; returns its own teardown. */
export const watchBrowserLanguages = (onChange: () => void): (() => void) => {
  window.addEventListener("languagechange", onChange);
  return () => window.removeEventListener("languagechange", onChange);
};
