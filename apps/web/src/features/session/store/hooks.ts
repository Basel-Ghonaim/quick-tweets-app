import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { AuthState } from "./state/AuthState";

// Typed store hooks scoped to the auth slice the module owns.

type AuthSliceState = { auth: AuthState };

export const useAuthSelector: TypedUseSelectorHook<AuthSliceState> = useSelector;

export const useAuthDispatch = () => useDispatch();
