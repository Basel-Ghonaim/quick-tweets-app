/**
 * Unit tests for the logout flow (#294).
 *
 * The server is the source of truth: the local session is cleared **only after**
 * the server confirms the logout; a failed logout keeps the user signed in and
 * surfaces the error so the user can explicitly retry. No automatic retry.
 * Exercised against a real store with a stubbed logout call — no DOM.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { authReducer, authActions } from "../store";
import { executeLogout } from "./executeLogout";
import { createAppError } from "@shared/errors";
import type { User } from "@shared/types";

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
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

const signIn = (store: ReturnType<typeof makeStore>) =>
  store.dispatch(
    authActions.authRequestFulfilled({
      requestType: "login",
      user,
      accessToken: "tok",
    }),
  );

describe("executeLogout — local sign-out only after the server confirms (#294)", () => {
  it("clears the local session when the server logout succeeds", async () => {
    const store = makeStore();
    signIn(store);

    await executeLogout(store.dispatch, () => Promise.resolve());

    const { auth } = store.getState();
    expect(auth.user).toBeNull();
    expect(auth.accessToken).toBeNull();
    expect(auth.requests.logout).toEqual({ status: "idle", error: null });
  });

  it("keeps the user signed in and surfaces the error when the server logout fails", async () => {
    const store = makeStore();
    signIn(store);
    const serverError = createAppError("network", "offline");

    await executeLogout(store.dispatch, () => Promise.reject(serverError));

    const { auth } = store.getState();
    expect(auth.user).toEqual(user); // NOT signed out locally
    expect(auth.accessToken).toBe("tok");
    expect(auth.requests.logout.status).toBe("error");
    expect(auth.requests.logout.error).toBe(serverError);
  });

  it("signs out on a user retry after a prior failure", async () => {
    const store = makeStore();
    signIn(store);
    await executeLogout(store.dispatch, () =>
      Promise.reject(createAppError("network", "offline")),
    );
    expect(store.getState().auth.requests.logout.status).toBe("error");

    // The user explicitly retries; this time the server confirms.
    await executeLogout(store.dispatch, () => Promise.resolve());

    const { auth } = store.getState();
    expect(auth.user).toBeNull();
    expect(auth.requests.logout).toEqual({ status: "idle", error: null });
  });
});
