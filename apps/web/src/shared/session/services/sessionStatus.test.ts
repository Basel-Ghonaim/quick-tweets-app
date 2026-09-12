import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import { sessionReducer, sessionActions } from "../store";
import { restoreSession } from "./restoreSession";

const makeStore = () =>
  configureStore({ reducer: { session: sessionReducer } });
const statusOf = (store: ReturnType<typeof makeStore>) => store.getState().session.status;

const USER = { id: 1, username: "ada" };
const session = { user: USER, accessToken: "a-token" };

/** Several sites end the session, each knowing the answer it reports. A reader
 *  waiting to be told must not be sent back to waiting by any of them. */
describe("the session status", () => {
  it("starts unknown, because nothing has asked yet", () => {
    expect(statusOf(makeStore())).toBe("unknown");
  });

  it("settles when a session is established", () => {
    const store = makeStore();

    store.dispatch(sessionActions.sessionEstablished(session));

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

describe("a session ending answers rather than forgets", () => {
  it("stays settled, and still clears the identity", () => {
    const store = makeStore();
    store.dispatch(sessionActions.sessionEstablished(session));

    store.dispatch(sessionActions.sessionEnded());

    expect(statusOf(store)).toBe("settled");
    expect(store.getState().session.accessToken).toBeNull();
    expect(store.getState().session.user).toBeNull();
  });

  it("settles even when it is the first thing that happens", () => {
    const store = makeStore();

    store.dispatch(sessionActions.sessionEnded());

    expect(statusOf(store)).toBe("settled");
  });

  it("clears its own sign-out slot", () => {
    const store = makeStore();
    store.dispatch(
      sessionActions.signOutRejected({ error: { type: "network", message: "no", status: 0 } }),
    );

    store.dispatch(sessionActions.sessionEnded());

    expect(store.getState().session.requests.signOut).toEqual({ status: "idle", error: null });
  });
});
