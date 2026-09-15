import { http, HttpResponse } from "msw";
import { api } from "../api";

const CURRENT = api("/channel-verification/challenges/current");
const ISSUE = api("/channel-verification/challenges");
const CONFIRM = api("/channel-verification/challenges/confirm");

/**
 * Where the holder stands. The wait is whole seconds, as the server states it —
 * the mapper anchors it to an instant on arrival, so a handler never sends one.
 */
export const verificationIs = (
  status: "unproven" | "pending" | "proven",
  resendAvailableInSeconds = 0,
) =>
  http.get(CURRENT, () =>
    HttpResponse.json({ success: true, data: { status, resendAvailableInSeconds } }),
  );

export const verificationIssues = (resendAvailableInSeconds = 60) =>
  http.post(ISSUE, () =>
    HttpResponse.json({
      success: true,
      data: { delivery: "accepted", resendAvailableInSeconds },
    }),
  );

export const verificationConfirms = () =>
  http.post(CONFIRM, () => HttpResponse.json({ success: true, data: null }));

/**
 * The two refusals mean different things to this capability: one is the address
 * being asked about too soon, the other this client being told to stop.
 */
export const verificationRefusesIssue = (
  type: "too_many_requests" | "rate_limit" = "too_many_requests",
) =>
  http.post(ISSUE, () =>
    HttpResponse.json({ success: false, error: { type, message: "raw" } }, { status: 429 }),
  );

export const verificationRefusesConfirm = (status = 400, type = "bad_request") =>
  http.post(CONFIRM, () =>
    HttpResponse.json({ success: false, error: { type, message: "raw" } }, { status }),
  );

/** Left in flight, so the sending and submitting states stay on screen. */
export const verificationNeverIssues = () =>
  http.post(ISSUE, () => new Promise<never>(() => {}));

export const verificationNeverConfirms = () =>
  http.post(CONFIRM, () => new Promise<never>(() => {}));
