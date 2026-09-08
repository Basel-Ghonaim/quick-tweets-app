import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "./session/hooks";

/**
 * A screen that asks for an account is not for a reader who has one, however
 * they reached it. It waits for the restore to answer rather than rendering and
 * correcting itself, so an account holder never sees the form.
 */
export const GuestOnly = ({ children }: { children: ReactElement }) => {
  const { isLoggedIn, sessionSettled } = useAuthState();

  if (!sessionSettled) return null;

  return isLoggedIn ? <Navigate to="/feed" replace /> : children;
};
