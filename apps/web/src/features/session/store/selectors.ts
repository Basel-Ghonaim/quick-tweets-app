import type { SessionState } from "./state/sessionState";
import { SESSION_SLICE_KEY } from "./sessionSlice";

export type WithSession = { [SESSION_SLICE_KEY]: SessionState };

export const selectAccessToken = (state: WithSession) => state.session.accessToken;
export const selectSessionUser = (state: WithSession) => state.session.user;
export const selectSessionStatus = (state: WithSession) => state.session.status;
export const selectSignOutRequest = (state: WithSession) => state.session.requests.signOut;
