import { appStorage, STORAGE_KEYS } from "@shared/storage";
import type { AuthState } from "./AuthState";
import type { User } from "@shared/types";

const token = appStorage.get<string>(STORAGE_KEYS.TOKEN);
const user = appStorage.get<User>(STORAGE_KEYS.USER);

export const initialState: AuthState = {
  user,
  token,
  requests: {
    login: { status: "idle", error: null },
    register: { status: "idle", error: null },
    logout: { status: "idle", error: null },
  },
};
