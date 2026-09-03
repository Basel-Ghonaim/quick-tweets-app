import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "../hooks";

/**
 * A screen that asks for an account is not for a reader who has one, however
 * they reached it. Session restore is non-blocking, so a direct load shows the
 * screen until the answer arrives and is redirected then.
 */
export const GuestOnly = ({ children }: { children: ReactElement }) => {
  const { isLoggedIn } = useAuthState();

  return isLoggedIn ? <Navigate to="/feed" replace /> : children;
};
