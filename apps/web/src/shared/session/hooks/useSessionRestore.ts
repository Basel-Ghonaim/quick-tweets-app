import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { restoreSession } from "../services";

// Non-blocking, hint-gated identity restore on mount — never gates render.
export const useSessionRestore = (): void => {
  const dispatch = useDispatch();

  useEffect(() => {
    void restoreSession(dispatch);
  }, [dispatch]);
};
