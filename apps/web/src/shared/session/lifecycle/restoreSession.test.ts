// restoreSession — injected seams against a real store (no DOM/network).
import { describe, it, expect, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import { sessionReducer, sessionActions } from "../state/sessionSlice";
import { restoreSession } from "./restoreSession";
import type { AuthUser } from "@shared/types";

const makeStore = () => configureStore({ reducer: { session: sessionReducer } });

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
    expect(store.getState().session.user).toBeNull();
    expect(store.getState().session.accessToken).toBeNull();
  });

  it("establishes the session when the hint is present and refresh succeeds", async () => {
    const store = makeStore();
    const refresh = vi.fn().mockResolvedValue({ user, accessToken: "tok" });

    await restoreSession(store.dispatch, {
      hasHint: () => true,
      refresh,
      clearHint: vi.fn(),
    });

    expect(refresh).toHaveBeenCalledOnce();
    const { session } = store.getState();
    expect(session.user).toEqual(user);
    expect(session.accessToken).toBe("tok");
  });

  it("clears the stale hint and resets to logged-out when refresh fails", async () => {
    const store = makeStore();
    store.dispatch(sessionActions.sessionEstablished({ user, accessToken: "old" }));
    const clearHint = vi.fn();

    await restoreSession(store.dispatch, {
      hasHint: () => true,
      refresh: vi.fn().mockRejectedValue(new Error("401")),
      clearHint,
    });

    expect(clearHint).toHaveBeenCalledOnce();
    const { session } = store.getState();
    expect(session.user).toBeNull();
    expect(session.accessToken).toBeNull();
  });
});
