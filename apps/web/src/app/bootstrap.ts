// App bootstrap — wires shared infrastructure (authClient) with Redux store.

import { setupAuthClient } from "@shared/api";
import { reduxStore } from "./store/store";
import { sessionActions, refreshSession } from "@modules/auth";

export const bootstrap = () => {
  setupAuthClient(
    () => reduxStore.getState().session.accessToken,
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
