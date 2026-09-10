import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "@shared/session";

interface GuestOnlyProps {
  children: ReactElement;
  /** Where a reader who already has what this screen offers goes instead.
   *  Required, so a call site answers it rather than inheriting an answer. */
  signedInTo: string;
}

/**
 * A screen that asks for an account is not for a reader who has one, however
 * they reached it. It waits for the restore to answer rather than rendering and
 * correcting itself, so an account holder never sees the form.
 */
export const GuestOnly = ({ children, signedInTo }: GuestOnlyProps) => {
  const { isLoggedIn, sessionSettled } = useAuthState();

  if (!sessionSettled) return null;

  return isLoggedIn ? <Navigate to={signedInTo} replace /> : children;
};
