// App bootstrap — wires shared infrastructure (authClient) with Redux store, and
// hands the error pipeline the words it reports failures in.

import { setupAuthClient } from "@shared/api";
import { ERROR_COPY } from "@shared/copy";
import { setupErrorMessages } from "@shared/errors";
import { setupLanguages } from "@shared/preferences";
import { reduxStore } from "./store/store";
import { sessionActions, refreshSession, selectAccessToken } from "@shared/session";

export const bootstrap = () => {
  setupLanguages(["en"]);
  setupErrorMessages(ERROR_COPY);

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
