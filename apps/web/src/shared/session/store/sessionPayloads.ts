import type { AuthUser } from "@shared/types";
import type { SerializedAppError } from "@shared/errors";

/** Either half may arrive alone: a refresh renews the token and keeps the user. */
export interface SessionEstablishedPayload {
  user?: AuthUser;
  accessToken?: string;
}

export interface SignOutRejectedPayload {
  error: SerializedAppError;
}
