import { appStorage, STORAGE_KEYS } from "@shared/storage";
import type { AuthState } from "./AuthState";
import type { User } from "@shared/types";

const user = appStorage.get<User>(STORAGE_KEYS.USER);

export const initialState: AuthState = {
  user,
  accessToken: null, // Always null on startup — token lives in Redux memory only
  requests: {
    login: { status: "idle", error: null },
    register: { status: "idle", error: null },
    logout: { status: "idle", error: null },
  },
};
