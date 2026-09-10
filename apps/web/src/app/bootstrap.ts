// App bootstrap — wires shared infrastructure (authClient) with Redux store.

import { setupAuthClient } from "@shared/api";
import { reduxStore } from "./store/store";
import { sessionActions, refreshSession, selectAccessToken } from "@shared/session";

export const bootstrap = () => {
  setupAuthClient(
    () => selectAccessToken(reduxStore.getState()),
    {
      refreshToken: refreshSession,
      onTokenRefreshed: (newAccessToken) => {
        reduxStore.dispatch(
          sessionActions.sessionEstablished({
            accessToken: newAccessToken,
          }),
        );
      },
      onSessionExpired: () => {
        reduxStore.dispatch(sessionActions.sessionEnded());
      },
    },
  );
};
