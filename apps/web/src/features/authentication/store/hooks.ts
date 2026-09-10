import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { AuthenticationState } from "./state/authenticationState";
import { AUTHENTICATION_SLICE_KEY } from "./authenticationSlice";

export type WithAuthentication = { [AUTHENTICATION_SLICE_KEY]: AuthenticationState };
export const useAuthenticationSelector: TypedUseSelectorHook<WithAuthentication> = useSelector;
