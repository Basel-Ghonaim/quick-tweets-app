// App bootstrap — wires shared infrastructure (authClient) with Redux store.

import { setupAuthClient } from "@shared/api";
import { reduxStore } from "./store/store";
import { authActions } from "@modules/auth";
import { appStorage, STORAGE_KEYS } from "@shared/storage";

export const bootstrap = () => {
  setupAuthClient(
    () => reduxStore.getState().auth.accessToken,
    {
      refreshToken: async () => {
        const { authClient } = await import("@shared/api");
        const res = await authClient.post("/auth/refresh");
        return res.data.accessToken;
      },
      onTokenRefreshed: (newAccessToken) => {
        reduxStore.dispatch(
          authActions.authRequestFulfilled({
            requestType: "login",
            accessToken: newAccessToken,
          }),
        );
      },
      onSessionExpired: () => {
        appStorage.remove(STORAGE_KEYS.USER);
        reduxStore.dispatch(authActions.authLogout());
      },
    },
  );
};
