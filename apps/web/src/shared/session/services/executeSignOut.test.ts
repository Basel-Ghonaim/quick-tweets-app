/**
 * The server is the source of truth: the local session is cleared only after
 * the server confirms the sign-out; a failure keeps the user signed in and
 * surfaces the error so the user can explicitly retry. No automatic retry.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer, sessionActions } from "../store";
import { executeSignOut } from "./executeSignOut";
import { createAppError } from "@shared/errors";
import type { AuthUser } from "@shared/types";

const makeStore = () => configureStore({ reducer: { session: sessionReducer } });

const user: AuthUser = { id: 1, username: "ada" };

const signIn = (store: ReturnType<typeof makeStore>) =>
  store.dispatch(sessionActions.sessionEstablished({ user, accessToken: "tok" }));

describe("executeSignOut — local sign-out only after the server confirms", () => {
  it("clears the local session when the server logout succeeds", async () => {
    const store = makeStore();
    signIn(store);

    await executeSignOut(store.dispatch, () => Promise.resolve());

    const { session } = store.getState();
    expect(session.user).toBeNull();
    expect(session.accessToken).toBeNull();
    expect(session.requests.signOut).toEqual({ status: "idle", error: null });
  });

  it("keeps the user signed in and surfaces the error when the server logout fails", async () => {
    const store = makeStore();
    signIn(store);
    const serverError = createAppError("network", "offline");

    await executeSignOut(store.dispatch, () => Promise.reject(serverError));

    const { session } = store.getState();
    expect(session.user).toEqual(user);
    expect(session.accessToken).toBe("tok");
    expect(session.requests.signOut.status).toBe("error");
    expect(session.requests.signOut.error).toMatchObject({ type: "network", message: "offline" });
    expect(session.requests.signOut.error).not.toBeInstanceOf(Error);
  });

  it("keeps the server's own message rather than wording the failure", async () => {
    const store = makeStore();
    signIn(store);

    await executeSignOut(store.dispatch, () =>
      Promise.reject(createAppError("unauthorized", "session already gone")),
    );

    expect(store.getState().session.requests.signOut.error).toMatchObject({
      type: "unauthorized",
      message: "session already gone",
    });
  });

  it("signs out on a user retry after a prior failure", async () => {
    const store = makeStore();
    signIn(store);
    await executeSignOut(store.dispatch, () =>
      Promise.reject(createAppError("network", "offline")),
    );
    expect(store.getState().session.requests.signOut.status).toBe("error");

    await executeSignOut(store.dispatch, () => Promise.resolve());

    const { session } = store.getState();
    expect(session.user).toBeNull();
    expect(session.requests.signOut).toEqual({ status: "idle", error: null });
  });
});
