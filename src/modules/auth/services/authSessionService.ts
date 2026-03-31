import { appStorage, STORAGE_KEYS } from "@shared/storage";
import type { User } from "@shared/types";

export const authSessionService = () => {
  const { set, remove, get } = appStorage;
  const { TOKEN, USER } = STORAGE_KEYS;

  return {
    saveAuthSession: (token: string, user: User) => {
      const savedToken = set(TOKEN, token);
      const savedUser = set(USER, user);
      return savedToken && savedUser;
    },
    clearAuthSession: () => {
      remove(TOKEN);
      remove(USER);
    },
    getToken: () => get<string>(TOKEN),
    getUser: () => get<User>(USER),
  };
};
