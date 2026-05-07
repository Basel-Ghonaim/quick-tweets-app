import { appStorage, STORAGE_KEYS } from "@shared/storage";
import type { User } from "@shared/types";

export const authSessionService = () => {
  const { set, remove, get } = appStorage;
  const { USER } = STORAGE_KEYS;

  return {
    saveAuthSession: (user: User) => {
      return set(USER, user);
    },
    clearAuthSession: () => {
      return remove(USER);
    },
    getUser: () => get<User>(USER),
  };
};
