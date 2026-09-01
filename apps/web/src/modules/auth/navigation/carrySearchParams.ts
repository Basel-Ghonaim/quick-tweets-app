/**
 * Builds a navigation target that carries named search parameters forward.
 *
 * React Router replaces the whole location when handed a path string, so a
 * parameter the current location carries is dropped by every `navigate("/x")`.
 * Where that parameter decides what the reader sees, the loss is silent: no
 * error, no remount, only a different page than the one they were looking at.
 *
 * Pure, so the rule is provable without a router. Which parameters travel is
 * the caller's — this decides only how.
 */
export const carrySearchParams = (
  to: string,
  preserved: readonly string[],
  current: URLSearchParams,
): string => {
  const [beforeHash, hash] = splitOnce(to, "#");
  const [path, ownQuery] = splitOnce(beforeHash, "?");

  const params = new URLSearchParams(ownQuery);

  for (const name of preserved) {
    // An explicit value in `to` is a decision the caller made; a carried one is
    // a default, so it never overwrites.
    if (params.has(name)) continue;

    const value = current.get(name);
    if (value !== null) params.set(name, value);
  }

  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
};

const splitOnce = (value: string, separator: string): [string, string] => {
  const at = value.indexOf(separator);
  return at === -1 ? [value, ""] : [value.slice(0, at), value.slice(at + 1)];
};
