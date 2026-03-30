import { appStorage, STORAGE_KEYS } from "@shared/storage";
import type { User } from "@shared/types";

export const authSessionService = () => {
  const { set, remove, get } = appStorage;
  const { TOKEN, USER } = STORAGE_KEYS;

  return {
    saveAuthSession: (token: string, user: User) => {
      set(TOKEN, token);
      set(USER, user);
    },
    clearAuthSession: () => {
      remove(TOKEN);
      remove(USER);
    },
    getToken: () => get<string>(TOKEN),
    getUser: () => get<User>(USER),
  };
};
