import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { WithSession } from "../store/selectors";

export const useSessionSelector: TypedUseSelectorHook<WithSession> = useSelector;
