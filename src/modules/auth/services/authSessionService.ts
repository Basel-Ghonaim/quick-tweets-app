import { appStorage, STORAGE_KEYS } from "@shared/storage";
import type { User } from "@shared/types";

export const authSessionService = () => {
  const { set, remove, get } = appStorage;
  const { ACCESS_TOKEN, USER } = STORAGE_KEYS;

  return {
    saveAuthSession: (accessToken: string, user: User) => {
      const savedToken = set(ACCESS_TOKEN, accessToken);
      const savedUser = set(USER, user);
      return savedToken && savedUser;
    },
    clearAuthSession: () => {
      const removedToken = remove(ACCESS_TOKEN);
      const removedUser = remove(USER);
      return removedToken && removedUser;
    },
    getAccessToken: () => get<string>(ACCESS_TOKEN),
    getUser: () => get<User>(USER),
  };
};
