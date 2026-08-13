// Reads/clears the backend `qt_session` hint cookie (name must match the backend);
// the only place that knows how the "probable session" signal is stored.

const SESSION_HINT = "qt_session";

export const hasSessionHint = (): boolean =>
  document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_HINT}=`));

export const clearSessionHint = (): void => {
  document.cookie = `${SESSION_HINT}=; Max-Age=0; Path=/`;
};
