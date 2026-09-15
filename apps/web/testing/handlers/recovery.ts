import { http, HttpResponse } from "msw";
import { api } from "../api";

const SESSION = api("/auth/password-reset/session");
const REQUEST = api("/auth/password-reset");
const RESEND = api("/auth/password-reset/resend");
const CONFIRM = api("/auth/password-reset/confirm");
const APPLY = api("/auth/password-reset/apply");

interface Position {
  step?: "request" | "code" | "password";
  maskedEndpoint?: string | null;
  retryAfterSeconds?: number;
  canResend?: boolean;
}

const position = (over: Position = {}) => ({
  step: "request" as const,
  maskedEndpoint: null,
  retryAfterSeconds: 0,
  canResend: false,
  ...over,
});

const answering = (over: Position = {}) =>
  HttpResponse.json({ success: true, data: position(over) });

/** Where the reader stands. An absent position answers `request`, so this read
 *  never fails for want of one. */
export const recoveryPositionIs = (over: Position = {}) =>
  http.get(SESSION, () => answering(over));

/** A read that failed. The screen renders a retry rather than the first step,
 *  because sending a reader back would discard a recovery the server holds. */
export const recoveryPositionRefuses = (status = 400) =>
  http.get(SESSION, () => new HttpResponse(null, { status }));

/** A read left open, so the pending state stays on screen. */
export const recoveryPositionNeverAnswers = () =>
  http.get(SESSION, () => new Promise<never>(() => {}));

export const recoveryRequests = (over: Position = { step: "code" }) =>
  http.post(REQUEST, () => answering(over));

export const recoveryRequestRefuses = (status = 429, type = "rate_limit") =>
  http.post(REQUEST, () =>
    HttpResponse.json({ success: false, error: { type, message: "raw" } }, { status }),
  );

export const recoveryRequestNeverAnswers = () =>
  http.post(REQUEST, () => new Promise<never>(() => {}));

export const recoveryResends = (over: Position = { step: "code" }) =>
  http.post(RESEND, () => answering(over));

export const recoveryConfirms = () =>
  http.post(CONFIRM, () => HttpResponse.json({ success: true, data: null }));

export const recoveryConfirmRefuses = (status = 400, type = "bad_request") =>
  http.post(CONFIRM, () =>
    HttpResponse.json({ success: false, error: { type, message: "raw" } }, { status }),
  );

export const recoveryConfirmNeverAnswers = () =>
  http.post(CONFIRM, () => new Promise<never>(() => {}));

export const recoveryApplies = () =>
  http.post(APPLY, () => HttpResponse.json({ success: true, data: null }));

export const recoveryApplyRefuses = (status = 400, type = "bad_request") =>
  http.post(APPLY, () =>
    HttpResponse.json({ success: false, error: { type, message: "raw" } }, { status }),
  );

export const recoveryApplyNeverAnswers = () =>
  http.post(APPLY, () => new Promise<never>(() => {}));
