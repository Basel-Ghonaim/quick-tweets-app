import type { User } from "@shared/types";
import type { AuthState } from "../state/AuthState";
import type { AppError } from "@shared/errors";

export type AuthRequestType = keyof AuthState["requests"];
export interface AuthRequestPayload {
  requestType: AuthRequestType;
}
export interface AuthRequestFulfilledPayload extends AuthRequestPayload {
  user?: User;
  accessToken?: string;
}
export interface AuthRequestRejectedPayload extends AuthRequestPayload {
  error: AppError;
}

export interface SessionHydratedPayload {
  user?: User;
  accessToken?: string;
}
