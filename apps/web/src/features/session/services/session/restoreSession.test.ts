// restoreSession — injected seams against a real store (no DOM/network).
import { describe, it, expect, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import { authReducer, authActions } from "../../store";
import { restoreSession } from "./restoreSession";
import type { AuthUser } from "@shared/types";

const makeStore = () => configureStore({ reducer: { auth: authReducer } });

const user: AuthUser = { id: 1, username: "ada" };

describe("restoreSession", () => {
  it("does NOT attempt a refresh when there is no session hint (guest)", async () => {
    const store = makeStore();
    const refresh = vi.fn();

    await restoreSession(store.dispatch, {
      hasHint: () => false,
      refresh,
      clearHint: vi.fn(),
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.accessToken).toBeNull();
  });

  it("hydrates the session when the hint is present and refresh succeeds", async () => {
    const store = makeStore();
    const refresh = vi.fn().mockResolvedValue({ user, accessToken: "tok" });

    await restoreSession(store.dispatch, {
      hasHint: () => true,
      refresh,
      clearHint: vi.fn(),
    });

    expect(refresh).toHaveBeenCalledOnce();
    const { auth } = store.getState();
    expect(auth.user).toEqual(user);
    expect(auth.accessToken).toBe("tok");
  });

  it("clears the stale hint and resets to logged-out when refresh fails", async () => {
    const store = makeStore();
    store.dispatch(authActions.sessionHydrated({ user, accessToken: "old" }));
    const clearHint = vi.fn();

    await restoreSession(store.dispatch, {
      hasHint: () => true,
      refresh: vi.fn().mockRejectedValue(new Error("401")),
      clearHint,
    });

    expect(clearHint).toHaveBeenCalledOnce();
    const { auth } = store.getState();
    expect(auth.user).toBeNull();
    expect(auth.accessToken).toBeNull();
  });
});
