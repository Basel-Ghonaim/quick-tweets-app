import type { AppStorage, StorageKey } from "./AppStorage";

export const storageFactory = (): AppStorage => ({
  set: <T>(key: StorageKey, value: T): boolean => {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch {
      return false;
    }
  },

  get: <T>(key: StorageKey): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  remove: (key: StorageKey): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
});

export const appStorage = storageFactory();
