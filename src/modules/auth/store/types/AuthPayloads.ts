import type { User } from "@shared/types";
import type { AuthState } from "../state/AuthState";
import type { SerializedAppError } from "@shared/errors";

export type AuthRequestType = keyof AuthState["requests"];
export interface AuthRequestPayload {
  requestType: AuthRequestType;
}
export interface AuthRequestFulfilledPayload extends AuthRequestPayload {
  user?: User;
  accessToken?: string;
}
export interface AuthRequestRejectedPayload extends AuthRequestPayload {
  error: SerializedAppError;
}

export interface SessionHydratedPayload {
  user?: User;
  accessToken?: string;
}
