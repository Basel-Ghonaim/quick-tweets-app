// A bare string, never a serialised value: the reader that matters most runs before the bundle
// exists and cannot import this module (Finding 0018), so it reads the choice in one line.
const NAMESPACE = "quick-tweets";

export interface StoredChoice {
  /** The stored value, or `null` when none was kept or storage is unreadable. */
  read: () => string | null;
  write: (value: string) => void;
}

/** One remembered choice, guarded on both sides because storage throws outright in some privacy modes. */
export const storedChoice = (name: string): StoredChoice => {
  const key = `${NAMESPACE}:${name}`;

  return {
    read: () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // A choice that cannot be kept still holds for this visit.
      }
    },
  };
};
