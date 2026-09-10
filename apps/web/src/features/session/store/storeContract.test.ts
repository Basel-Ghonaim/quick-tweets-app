/**
 * Characterization of the store-access contract the hooks read and drive, kept
 * across the split of one slice into two. Every scenario here predates the split.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer, sessionActions } from "./sessionSlice";
import { authenticationReducer, authenticationActions } from "./authenticationSlice";
import { createAppError } from "@shared/errors";
import type { AuthUser } from "@shared/types";

// serializableCheck stays ON: the store holds only the plain SerializedAppError DTO.
const makeStore = () =>
  configureStore({
    reducer: { session: sessionReducer, authentication: authenticationReducer },
  });

const user: AuthUser = { id: 1, username: "ada" };

describe("store-access contract", () => {
  it("exposes the initial shape the hooks select", () => {
    const { session, authentication } = makeStore().getState();

    expect(session.user).toBeNull();
    expect(session.accessToken).toBeNull();
    expect(authentication.login).toEqual({ status: "idle", error: null });
    expect(authentication.register).toEqual({ status: "idle", error: null });
    expect(session.requests.signOut).toEqual({ status: "idle", error: null });
  });

  it("moves a request to loading on pending (the first dispatch of every flow)", () => {
    const store = makeStore();

    store.dispatch(authenticationActions.requestPending({ requestType: "login" }));

    expect(store.getState().authentication.login).toEqual({ status: "loading", error: null });
  });

  it("commits the session and marks success on a fulfilled login", () => {
    const store = makeStore();

    store.dispatch(sessionActions.sessionEstablished({ user, accessToken: "tok-123" }));
    store.dispatch(authenticationActions.requestFulfilled({ requestType: "login" }));

    const { session, authentication } = store.getState();
    expect(authentication.login).toEqual({ status: "success", error: null });
    expect(session.user).toEqual(user);
    expect(session.accessToken).toBe("tok-123");
  });

  it("records the error and marks error on rejected (what useAuthFlow surfaces)", () => {
    const store = makeStore();
    const error = createAppError("unknown", "boom").toSerialized();

    store.dispatch(authenticationActions.requestRejected({ requestType: "login", error }));

    const requestState = store.getState().authentication.login;
    expect(requestState.status).toBe("error");
    expect(requestState.error).toEqual(error);
    expect(requestState.error).not.toBeInstanceOf(Error);
  });

  it("a request slot changing says nothing about the session", () => {
    const store = makeStore();
    store.dispatch(sessionActions.sessionEstablished({ user, accessToken: "tok-123" }));

    store.dispatch(authenticationActions.requestFulfilled({ requestType: "register" }));

    const { session } = store.getState();
    expect(session.user).toEqual(user);
    expect(session.accessToken).toBe("tok-123");
  });
});

describe("a session established any other way", () => {
  it("touches no authentication slot (session restore)", () => {
    const store = makeStore();

    store.dispatch(sessionActions.sessionEstablished({ user, accessToken: "tok-restore" }));

    const { session, authentication } = store.getState();
    expect(session.user).toEqual(user);
    expect(session.accessToken).toBe("tok-restore");
    expect(authentication.login).toEqual({ status: "idle", error: null });
    expect(authentication.register).toEqual({ status: "idle", error: null });
  });

  it("with only a token renews the token and keeps the user (silent refresh)", () => {
    const store = makeStore();
    store.dispatch(sessionActions.sessionEstablished({ user, accessToken: "tok-1" }));

    store.dispatch(sessionActions.sessionEstablished({ accessToken: "tok-2" }));

    const { session, authentication } = store.getState();
    expect(session.accessToken).toBe("tok-2");
    expect(session.user).toEqual(user);
    expect(authentication.login).toEqual({ status: "idle", error: null });
  });
});
