import { useEffect } from "react";
import { useAuthDispatch } from "../store/hooks";
import { restoreSession } from "../services";

// Non-blocking, hint-gated identity restore on mount — never gates render.
export const useSessionRestore = (): void => {
  const dispatch = useAuthDispatch();

  useEffect(() => {
    void restoreSession(dispatch);
  }, [dispatch]);
};
