import type { User } from "@shared/types";
import type { AuthState } from "../state/AuthState";

export type AuthRequestType = keyof AuthState["requests"];
export interface AuthRequestPayload {
  requestType: AuthRequestType;
}
export interface AuthRequestFulfilledPayload extends AuthRequestPayload {
  user?: User;
  token?: string;
}
export interface AuthRequestRejectedPayload extends AuthRequestPayload {
  error: Error;
}
