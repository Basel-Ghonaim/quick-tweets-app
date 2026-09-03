import { describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { createAppError } from "@shared/errors";
import { authReducer } from "../store";
import { executeVerification } from "./executeVerification";
import { AUTH_COPY } from "../config/copy";

const store = () => configureStore({ reducer: { auth: authReducer } });
const issued = { delivery: "accepted" as const, resendAvailableInSeconds: 60 };

describe("executeVerification", () => {
  it("reports each request through its own state, so a resend never busies the submit", async () => {
    const s = store();

    await executeVerification(s.dispatch, async () => issued, "issueCode");

    expect(s.getState().auth.requests.issueCode.status).toBe("success");
    expect(s.getState().auth.requests.confirmCode.status).toBe("idle");
  });

  it("commits no identity — proving an address is not a session change", async () => {
    const s = store();

    await executeVerification(s.dispatch, async () => issued, "issueCode");

    expect(s.getState().auth.user).toBeNull();
    expect(s.getState().auth.accessToken).toBeNull();
  });

  it("tells the address cooldown apart from the client limiter", async () => {
    const cooled = store();
    const limited = store();

    await expect(
      executeVerification(
        cooled.dispatch,
        vi.fn(async () => {
          throw createAppError("too_many_requests", "raw");
        }),
        "issueCode",
      ),
    ).rejects.toThrow();

    await expect(
      executeVerification(
        limited.dispatch,
        vi.fn(async () => {
          throw createAppError("rate_limit", "raw");
        }),
        "issueCode",
      ),
    ).rejects.toThrow();

    expect(cooled.getState().auth.requests.issueCode.error?.message).toBe(
      AUTH_COPY.verify.cooldownRefused,
    );
    expect(limited.getState().auth.requests.issueCode.error?.message).toBe(
      AUTH_COPY.verify.rateLimited,
    );
  });

  it("gives a rejected code verification's wording, not the form-level one", async () => {
    const s = store();

    await expect(
      executeVerification(
        s.dispatch,
        vi.fn(async () => {
          throw createAppError("bad_request", "raw");
        }),
        "confirmCode",
      ),
    ).rejects.toThrow();

    expect(s.getState().auth.requests.confirmCode.error?.message).toBe(
      AUTH_COPY.verify.codeRejected,
    );
  });
});
