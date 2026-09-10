import type { SerializedAppError } from "@shared/errors";
import type { AuthenticationState } from "../state/authenticationState";

export type AuthRequestType = keyof AuthenticationState;

export interface AuthRequestPayload {
  requestType: AuthRequestType;
}

export interface AuthRequestRejectedPayload extends AuthRequestPayload {
  error: SerializedAppError;
}
