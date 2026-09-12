import type { Dispatch } from "@reduxjs/toolkit";
import { restSession, hasSessionHint, clearSessionHint } from "../gateway";
import { sessionActions } from "../store";
import type { AuthResponse } from "../model";

// Injectable seams so the policy is unit-testable in Node (no DOM/network).
export interface RestoreSessionDeps {
  hasHint: () => boolean;
  refresh: () => Promise<AuthResponse>;
  clearHint: () => void;
}

const defaultDeps = (): RestoreSessionDeps => ({
  hasHint: hasSessionHint,
  refresh: () => restSession().refresh(),
  clearHint: clearSessionHint,
});

// Silent restore, attempted only when the hint says a session probably exists.
export const restoreSession = async (
  dispatch: Dispatch,
  deps: RestoreSessionDeps = defaultDeps(),
): Promise<void> => {
  // No hint is an answer, not the absence of one: this reader is a guest.
  if (!deps.hasHint()) {
    dispatch(sessionActions.sessionSettled());
    return;
  }

  try {
    const { user, accessToken } = await deps.refresh();
    dispatch(sessionActions.sessionEstablished({ user, accessToken }));
  } catch {
    deps.clearHint();
    dispatch(sessionActions.sessionEnded());
  }
};
