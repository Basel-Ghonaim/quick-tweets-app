import { describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../store";
import { executeProfileUpdate } from "./executeProfileUpdate";
import { createAppError } from "@shared/errors";

const store = () => configureStore({ reducer: { auth: authReducer } });
const profile = { username: "ada", name: "Ada", bio: "hello" };

describe("executeProfileUpdate", () => {
  it("reports the request through its own state, leaving the others alone", async () => {
    const s = store();

    await executeProfileUpdate(s.dispatch, async () => profile);

    expect(s.getState().auth.requests.updateProfile.status).toBe("success");
    expect(s.getState().auth.requests.login.status).toBe("idle");
  });

  it("commits no identity — a profile update is not a session change", async () => {
    const s = store();

    await executeProfileUpdate(s.dispatch, async () => profile);

    expect(s.getState().auth.user).toBeNull();
    expect(s.getState().auth.accessToken).toBeNull();
  });

  it("surfaces a failure as the feature's own wording and re-raises it", async () => {
    const s = store();
    const failing = vi.fn(async () => {
      throw createAppError("conflict", "raw");
    });

    await expect(executeProfileUpdate(s.dispatch, failing)).rejects.toThrow();

    const request = s.getState().auth.requests.updateProfile;
    expect(request.status).toBe("error");
    expect(request.error?.message).not.toBe("raw");
  });
});
