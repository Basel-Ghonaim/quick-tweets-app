/**
 * Authentication success is the server response alone: the flow commits the
 * session it yields and marks its own slot. No local persistence gates it.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer, type AuthResponse } from "@shared/session";
import { authenticationReducer } from "../../store";
import { executeAuthFlow } from "./executeAuthFlow";
import { createAppError } from "@shared/errors";
import { CATALOGUES } from "@shared/copy";
import type { AuthUser } from "@shared/types";

const makeStore = () =>
  configureStore({
    reducer: { session: sessionReducer, authentication: authenticationReducer },
  });

const user: AuthUser = { id: 1, username: "ada" };
const response: AuthResponse = { user, accessToken: "tok-123" };

describe("executeAuthFlow — success is the server response, no persistence gate", () => {
  it("commits the session and marks the slot on a successful server response", async () => {
    const store = makeStore();

    await executeAuthFlow(store.dispatch, () => Promise.resolve(response), "login", CATALOGUES.en.auth.errors);

    const { session, authentication } = store.getState();
    expect(authentication.login).toEqual({ status: "success", error: null });
    expect(session.user).toEqual(user);
    expect(session.accessToken).toBe("tok-123");
    expect(session.status).toBe("settled");
  });

  it("rejects and records the error on a server authentication failure", async () => {
    const store = makeStore();
    const serverError = createAppError("unknown", "bad credentials");

    await expect(
      executeAuthFlow(store.dispatch, () => Promise.reject(serverError), "login", CATALOGUES.en.auth.errors),
    ).rejects.toBeTruthy();

    const { session, authentication } = store.getState();
    expect(authentication.login.status).toBe("error");
    expect(authentication.login.error).toMatchObject({ type: "unknown", message: "bad credentials" });
    expect(authentication.login.error).not.toBeInstanceOf(Error);
    expect(session.user).toBeNull();
    expect(session.accessToken).toBeNull();
  });
});
