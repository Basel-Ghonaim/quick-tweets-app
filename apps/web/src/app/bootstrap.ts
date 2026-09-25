// App bootstrap — wires shared infrastructure (authClient) with Redux store,
// hands the error pipeline the words it reports failures in, and gives the
// Design System the element its destinations navigate with.

import { setupAuthClient } from "@shared/api";
import { setupNavigation } from "@shared/design-system";
import { CATALOGUES, currentCopy } from "@shared/copy";
import { setupErrorMessages } from "@shared/errors";
import { setupLocalisation } from "@shared/localisation";
import { RouterAnchor } from "@shared/routing";
import { reduxStore } from "./store/store";
import { sessionActions, refreshSession, selectAccessToken } from "@shared/session";

export const bootstrap = () => {
  setupLocalisation(CATALOGUES);
  // The Design System renders destinations but holds no router: a router's link
  // throws outside the router this application mounts, so it is handed in here.
  setupNavigation(RouterAnchor);
  setupErrorMessages(() => currentCopy().errors);

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
