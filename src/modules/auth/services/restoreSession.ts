import type { Dispatch } from "@reduxjs/toolkit";
import { restAuth } from "../repository/restAuth";
import { authActions } from "../store";
import type { AuthResponse } from "../entity";
import { hasSessionHint, clearSessionHint } from "./sessionHint";

// Injectable seams so the policy is unit-testable in Node (no DOM/network).
export interface RestoreSessionDeps {
  hasHint: () => boolean;
  refresh: () => Promise<AuthResponse>;
  clearHint: () => void;
}

const defaultDeps = (): RestoreSessionDeps => ({
  hasHint: hasSessionHint,
  refresh: () => restAuth().refresh(),
  clearHint: clearSessionHint,
});

// Silent restore, attempted only when the hint says a session probably exists.
export const restoreSession = async (
  dispatch: Dispatch,
  deps: RestoreSessionDeps = defaultDeps(),
): Promise<void> => {
  if (!deps.hasHint()) return;

  try {
    const { user, accessToken } = await deps.refresh();
    dispatch(authActions.sessionHydrated({ user, accessToken }));
  } catch {
    deps.clearHint();
    dispatch(authActions.authLogout());
  }
};
