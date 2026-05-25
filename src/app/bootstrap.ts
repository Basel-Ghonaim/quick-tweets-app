/**
 * App bootstrap — wires shared infrastructure with app-level dependencies.
 *
 * Purpose:
 * - Connects the authClient (shared layer) to Redux store (app layer)
 * - Must be called once in main.tsx before rendering the app
 * - This is the ONLY place where shared/api touches app/store
 *
 * Why here:
 * - shared/ must have zero domain knowledge (no Redux, no auth)
 * - The app layer owns the wiring responsibility
 * - Keeps the dependency flow correct: app → shared (never shared → app)
 *
 */

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
