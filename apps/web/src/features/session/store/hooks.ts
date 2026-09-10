import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { WithSession } from "./selectors";
import type { AuthenticationState } from "./state/authenticationState";
import { AUTHENTICATION_SLICE_KEY } from "./authenticationSlice";

export const useSessionSelector: TypedUseSelectorHook<WithSession> = useSelector;

export type WithAuthentication = { [AUTHENTICATION_SLICE_KEY]: AuthenticationState };
export const useAuthenticationSelector: TypedUseSelectorHook<WithAuthentication> = useSelector;
