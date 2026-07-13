// App bootstrap — wires shared infrastructure (authClient) with Redux store.

import { setupAuthClient } from "@shared/api";
import { reduxStore } from "./store/store";
import { authActions, refreshSession } from "@modules/auth";

export const bootstrap = () => {
  setupAuthClient(
    () => reduxStore.getState().auth.accessToken,
    {
      refreshToken: refreshSession,
      onTokenRefreshed: (newAccessToken) => {
        reduxStore.dispatch(
          authActions.sessionHydrated({
            accessToken: newAccessToken,
          }),
        );
      },
      onSessionExpired: () => {
        reduxStore.dispatch(authActions.authLogout());
      },
    },
  );
};
