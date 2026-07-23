/**
 * Unit tests for the shared auth flow (#258).
 *
 * Authentication success is determined solely by the server response: the flow
 * commits the authenticated state on success and rejects on failure. There is no
 * local persistence, so nothing can gate a successful login. Exercised against a
 * real store with a stubbed API call — no DOM.
 */
import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../../store";
import { executeAuthFlow } from "./executeAuthFlow";
import { createAppError } from "@shared/errors";
import type { User } from "@shared/types";
import type { AuthResponse } from "../../entity";

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
const session: AuthResponse = { user, accessToken: "tok-123" };

describe("executeAuthFlow — success is the server response, no persistence gate (#258)", () => {
  it("commits the authenticated state on a successful server response", async () => {
    const store = makeStore();

    await executeAuthFlow(store.dispatch, () => Promise.resolve(session), "login");

    const { auth } = store.getState();
    expect(auth.requests.login).toEqual({ status: "success", error: null });
    expect(auth.user).toEqual(user);
    expect(auth.accessToken).toBe("tok-123");
  });

  it("rejects and records the error on a server authentication failure", async () => {
    const store = makeStore();
    const serverError = createAppError("unknown", "bad credentials");

    await expect(
      executeAuthFlow(store.dispatch, () => Promise.reject(serverError), "login"),
    ).rejects.toBeTruthy();

    const { auth } = store.getState();
    expect(auth.requests.login.status).toBe("error");
    expect(auth.requests.login.error).toMatchObject({ type: "unknown", message: "bad credentials" });
    expect(auth.requests.login.error).not.toBeInstanceOf(Error); // stored as a plain DTO
    expect(auth.user).toBeNull();
    expect(auth.accessToken).toBeNull();
  });
});
