/**
 * React Router replaces the whole location when handed a path string, so a
 * parameter the current location carries is dropped by every `navigate("/x")`.
 * Where that parameter decides what the reader sees, the loss is silent.
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
    // A value written into `to` is a decision; a carried one is only a default.
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
