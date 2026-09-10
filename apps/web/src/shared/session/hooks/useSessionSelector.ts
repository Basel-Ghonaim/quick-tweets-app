import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { WithSession } from "../state/selectors";

export const useSessionSelector: TypedUseSelectorHook<WithSession> = useSelector;
