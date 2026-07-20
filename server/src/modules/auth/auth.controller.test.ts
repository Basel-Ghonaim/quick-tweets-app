// Auth controller — session-cookie policy: login/register/refresh set both the
// refresh cookie and the qt_session hint; logout/logout-all clear both.

import { describe, expect, it } from "vitest";

import { createAuthController } from "./auth.controller";
import type { IAuthService } from "./auth.types";

interface CookieCall {
  name: string;
  value?: string;
  options?: Record<string, unknown>;
}

const makeRes = () => {
  const set: CookieCall[] = [];
  const cleared: CookieCall[] = [];
  const res = {
    cookie(name: string, value: string, options: Record<string, unknown>) {
      set.push({ name, value, options });
      return this;
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      cleared.push({ name, options });
      return this;
    },
    status() {
      return this;
    },
    json() {
      return this;
    },
    send() {
      return this;
    },
  };
  return { res, set, cleared };
};

const user = {
  id: 1, username: "ada", name: "Ada", email: "a@x.com",
  profileImage: null, bio: "", createdAt: new Date(),
};
const authResult = { user, accessToken: "a", refreshToken: "r", avatarToken: null };

const stubService = (): IAuthService =>
  ({
    register: async () => authResult,
    login: async () => authResult,
    logout: async () => {},
    logoutAll: async () => {},
    refreshToken: async () => authResult,
    getMe: async () => ({ user, avatarToken: null }),
  }) as never;

const names = (calls: CookieCall[]) => calls.map((c) => c.name);
const noop = (() => {}) as never;

describe("auth controller — session cookies (refresh + hint)", () => {
  it("register sets both the httpOnly refresh cookie and the readable qt_session hint", async () => {
    const { res, set } = makeRes();
    await createAuthController(stubService()).register({ body: {} } as never, res as never, noop);

    expect(names(set)).toEqual(expect.arrayContaining(["refreshToken", "qt_session"]));
    const refresh = set.find((c) => c.name === "refreshToken")!;
    const hint = set.find((c) => c.name === "qt_session")!;
    expect(refresh.options?.httpOnly).toBe(true);
    expect(hint.options?.httpOnly).toBe(false); // JS-readable, non-secret marker
    expect(hint.value).toBe("1");
    expect(hint.options?.path).toBe("/"); // readable app-wide
  });

  it("login and refresh also set both cookies", async () => {
    for (const handler of ["login", "refresh"] as const) {
      const { res, set } = makeRes();
      const req = { body: {}, cookies: { refreshToken: "r" } } as never;
      await createAuthController(stubService())[handler](req, res as never, noop);
      expect(names(set)).toEqual(expect.arrayContaining(["refreshToken", "qt_session"]));
    }
  });

  it("logout and logout-all clear both cookies", async () => {
    for (const handler of ["logout", "logoutAll"] as const) {
      const { res, cleared } = makeRes();
      const req = { cookies: { refreshToken: "r" }, userId: 1 } as never;
      await createAuthController(stubService())[handler](req, res as never, noop);
      expect(names(cleared)).toEqual(expect.arrayContaining(["refreshToken", "qt_session"]));
    }
  });
});
