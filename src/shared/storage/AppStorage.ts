export const STORAGE_KEYS = {
  USER: "user",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface AppStorage {
  set<T>(key: StorageKey, value: T): boolean;
  get<T>(key: StorageKey): T | null;
  remove(key: StorageKey): boolean;
}
