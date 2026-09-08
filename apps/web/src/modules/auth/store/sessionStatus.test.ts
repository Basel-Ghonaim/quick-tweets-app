import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import { authReducer, authActions } from "./authSlice";
import { restoreSession } from "../session/services/session/restoreSession";

const makeStore = () => configureStore({ reducer: { auth: authReducer } });
const statusOf = (store: ReturnType<typeof makeStore>) => store.getState().auth.session;

const USER = { id: 1, username: "ada" };
const session = { user: USER, accessToken: "a-token" };

/**
 * Three separate call sites dispatch `authLogout`, and each knows the answer it
 * is reporting. A reader waiting to be told must not be sent back to waiting by
 * any of them.
 */
describe("the session status", () => {
  it("starts unknown, because nothing has asked yet", () => {
    expect(statusOf(makeStore())).toBe("unknown");
  });

  it("settles when a session is hydrated", () => {
    const store = makeStore();

    store.dispatch(authActions.sessionHydrated(session));

    expect(statusOf(store)).toBe("settled");
  });

  it("settles for a guest, whose restore is never attempted", async () => {
    const store = makeStore();

    await restoreSession(store.dispatch, {
      hasHint: () => false,
      refresh: async () => {
        throw new Error("a guest must not be asked about");
      },
      clearHint: () => {},
    });

    expect(statusOf(store)).toBe("settled");
  });

  it("settles when a hinted restore fails", async () => {
    const store = makeStore();

    await restoreSession(store.dispatch, {
      hasHint: () => true,
      refresh: async () => {
        throw new Error("expired");
      },
      clearHint: () => {},
    });

    expect(statusOf(store)).toBe("settled");
  });

  it("settles when a hinted restore succeeds", async () => {
    const store = makeStore();

    await restoreSession(store.dispatch, {
      hasHint: () => true,
      refresh: async () => session as never,
      clearHint: () => {},
    });

    expect(statusOf(store)).toBe("settled");
  });
});

/**
 * `authLogout` is what `executeLogout` and the expiry callback in `bootstrap`
 * both dispatch, so these cover all three sites through the action they share.
 */
describe("a logout answers rather than forgets", () => {
  it("stays settled, and still clears the identity", () => {
    const store = makeStore();
    store.dispatch(authActions.sessionHydrated(session));

    store.dispatch(authActions.authLogout());

    expect(statusOf(store)).toBe("settled");
    expect(store.getState().auth.accessToken).toBeNull();
    expect(store.getState().auth.user).toBeNull();
  });

  it("settles even when it is the first thing that happens", () => {
    const store = makeStore();

    store.dispatch(authActions.authLogout());

    expect(statusOf(store)).toBe("settled");
  });

  it("still clears every request slot", () => {
    const store = makeStore();
    store.dispatch(
      authActions.authRequestRejected({
        requestType: "login",
        error: { type: "unauthorized", message: "no", status: 401 },
      }),
    );

    store.dispatch(authActions.authLogout());

    expect(store.getState().auth.requests.login).toEqual({ status: "idle", error: null });
  });
});
