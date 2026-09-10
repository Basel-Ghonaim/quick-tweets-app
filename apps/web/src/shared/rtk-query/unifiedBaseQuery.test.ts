import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer, sessionActions } from "../session";
import { attachSessionBearer } from "./unifiedBaseQuery";

const makeStore = () => configureStore({ reducer: { session: sessionReducer } });

describe("the query base reads the session as a peer", () => {
  it("attaches the session's access token as a bearer", () => {
    const store = makeStore();
    store.dispatch(sessionActions.sessionEstablished({ accessToken: "tok-123" }));

    const headers = attachSessionBearer(new Headers(), store.getState);

    expect(headers.get("authorization")).toBe("Bearer tok-123");
  });

  it("sends no bearer when there is no session", () => {
    const headers = attachSessionBearer(new Headers(), makeStore().getState);

    expect(headers.get("authorization")).toBeNull();
  });
});
