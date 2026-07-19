/**
 * Characterization test for the auth store-access contract (Issue #253).
 *
 * The auth hooks (`useAuthState`, `useAuthFlow`, `useLogout`, `useAuthActions`,
 * `useInitAuth`) read the `auth` slice through inline selectors and drive it with
 * plain-action dispatches. Issue #253 relocates the *typing* of the store hooks
 * (`useAppSelector` / `useAppDispatch`) out of `@app/store` and into the module —
 * a compile-time-only change with no runtime delta. This test locks the behavior
 * that change must preserve: the shape the hooks' selectors read, and the
 * transitions the actions they dispatch produce.
 *
 * It runs in the Node unit lane with no DOM: the slice, its reducers, and its
 * selectors are plain functions, so the hooks' store-access contract is
 * exercisable through a real store without rendering React. Rendering the hooks
 * would only exercise react-redux's subscription machinery, which the refactor
 * does not touch. This test must stay green both before and after the refactor.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { authReducer, authActions } from "./authSlice";
import { createAppError } from "@shared/errors";
import type { User } from "@shared/types";

// serializableCheck stays ON (the default): the store now holds only the plain
// SerializedAppError DTO, so the check passes — this locks that invariant.
const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
  });

const user: User = {
  id: 1,
  username: "ada",
  name: "Ada Lovelace",
  email: "ada@example.com",
  profileImage: null,
  avatar: null,
  bio: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("auth store-access contract (#253)", () => {
  it("exposes the initial shape the hooks select", () => {
    const { auth } = makeStore().getState();

    // useAuthState reads user + accessToken (isLoggedIn = !!accessToken && !!user).
    expect(auth.user).toBeNull();
    expect(auth.accessToken).toBeNull();

    // useAuthFlow / useLogout read requests[type]; every request idle at rest.
    expect(auth.requests.login).toEqual({ status: "idle", error: null });
    expect(auth.requests.register).toEqual({ status: "idle", error: null });
    expect(auth.requests.logout).toEqual({ status: "idle", error: null });
  });

  it("moves a request to loading on pending (the first dispatch of every flow)", () => {
    const store = makeStore();

    store.dispatch(authActions.authRequestPending({ requestType: "login" }));

    expect(store.getState().auth.requests.login).toEqual({
      status: "loading",
      error: null,
    });
  });

  it("stores user + accessToken and marks success on fulfilled", () => {
    const store = makeStore();

    store.dispatch(
      authActions.authRequestFulfilled({
        requestType: "login",
        user,
        accessToken: "tok-123",
      }),
    );

    const { auth } = store.getState();
    expect(auth.requests.login).toEqual({ status: "success", error: null });
    expect(auth.user).toEqual(user);
    expect(auth.accessToken).toBe("tok-123");
  });

  it("records the error and marks error on rejected (what useAuthFlow surfaces)", () => {
    const store = makeStore();
    const error = createAppError("unknown", "boom").toSerialized();

    store.dispatch(
      authActions.authRequestRejected({ requestType: "login", error }),
    );

    const requestState = store.getState().auth.requests.login;
    expect(requestState.status).toBe("error");
    expect(requestState.error).toEqual(error);
    expect(requestState.error).not.toBeInstanceOf(Error); // a plain DTO, not the AppError class
  });

  it("marks logout success without clearing identity in the slice", () => {
    // The fulfilled reducer only writes user/accessToken when they are provided,
    // so a fulfilled dispatch carrying neither leaves identity untouched — this
    // locks that reducer guard. (The logout *flow* itself now resets via
    // authLogout, #294; this characterizes the reducer, not the flow.)
    const store = makeStore();
    store.dispatch(
      authActions.authRequestFulfilled({
        requestType: "login",
        user,
        accessToken: "tok-123",
      }),
    );

    store.dispatch(authActions.authRequestFulfilled({ requestType: "logout" }));

    const { auth } = store.getState();
    expect(auth.requests.logout).toEqual({ status: "success", error: null });
    expect(auth.user).toEqual(user); // unchanged
    expect(auth.accessToken).toBe("tok-123"); // unchanged
  });
});

describe("session hydration (#257)", () => {
  it("sessionHydrated updates identity only and leaves every request slot idle (session restore)", () => {
    const store = makeStore();

    store.dispatch(
      authActions.sessionHydrated({ user, accessToken: "tok-restore" }),
    );

    const { auth } = store.getState();
    expect(auth.user).toEqual(user);
    expect(auth.accessToken).toBe("tok-restore");
    // Restore is not a user-initiated login — no request slot is touched.
    expect(auth.requests.login).toEqual({ status: "idle", error: null });
    expect(auth.requests.register).toEqual({ status: "idle", error: null });
    expect(auth.requests.logout).toEqual({ status: "idle", error: null });
  });

  it("sessionHydrated with only an accessToken renews the token, keeps user, login idle (silent refresh)", () => {
    const store = makeStore();
    store.dispatch(authActions.sessionHydrated({ user, accessToken: "tok-1" }));

    // A background refresh supplies a new token, no user.
    store.dispatch(authActions.sessionHydrated({ accessToken: "tok-2" }));

    const { auth } = store.getState();
    expect(auth.accessToken).toBe("tok-2");
    expect(auth.user).toEqual(user); // unchanged by the token-only refresh
    expect(auth.requests.login).toEqual({ status: "idle", error: null });
  });

  it("a user login still transitions the login slot to success (unchanged by #257)", () => {
    const store = makeStore();

    store.dispatch(authActions.authRequestPending({ requestType: "login" }));
    expect(store.getState().auth.requests.login.status).toBe("loading");

    store.dispatch(
      authActions.authRequestFulfilled({
        requestType: "login",
        user,
        accessToken: "tok-login",
      }),
    );

    const { auth } = store.getState();
    expect(auth.requests.login).toEqual({ status: "success", error: null });
    expect(auth.user).toEqual(user);
    expect(auth.accessToken).toBe("tok-login");
  });
});
