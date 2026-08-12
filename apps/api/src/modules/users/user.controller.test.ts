// GET /users/:username handle resolution — a current username serves, a former
// (alias) handle 301-redirects to the canonical URL, and an unknown handle 404s.

import { describe, expect, it } from "vitest";

import { createUserController } from "./user.controller";
import type { IUserService } from "./user.types";
import type { ResolvedHandle } from "../../shared/identity/index.js";

const makeRes = () => {
  const calls = { redirect: [] as { status: number; url: string }[], json: [] as unknown[] };
  const res = {
    redirect(status: number, url: string) { calls.redirect.push({ status, url }); return this; },
    status() { return this; },
    json(body: unknown) { calls.json.push(body); return this; },
    send() { return this; },
  };
  return { res, calls };
};

const profile = { id: 1, username: "ada" };
const stubService = (): IUserService =>
  ({ getProfile: async () => profile, getMe: async () => profile, updateMe: async () => profile }) as never;

const req = (username: string) => ({ params: { username }, baseUrl: "/api/v1/users" }) as never;
const noop = (() => {}) as never;

describe("user controller — GET /users/:username handle resolution", () => {
  it("serves the profile for a current username (no redirect)", async () => {
    const { res, calls } = makeRes();
    const resolve = async (): Promise<ResolvedHandle> => ({ userId: 1, canonicalUsername: "ada", viaAlias: false });

    await createUserController(stubService(), resolve).getProfile(req("ada"), res as never, noop);

    expect(calls.redirect).toHaveLength(0);
    expect(calls.json).toHaveLength(1);
  });

  it("301-redirects a former handle to the canonical current username", async () => {
    const { res, calls } = makeRes();
    const resolve = async (): Promise<ResolvedHandle> => ({ userId: 1, canonicalUsername: "ada_new", viaAlias: true });

    await createUserController(stubService(), resolve).getProfile(req("ada_old"), res as never, noop);

    expect(calls.redirect).toEqual([{ status: 301, url: "/api/v1/users/ada_new" }]);
    expect(calls.json).toHaveLength(0);
  });

  it("404s an unknown handle", async () => {
    const { res } = makeRes();
    let nexted: { statusCode?: number } | undefined;
    const resolve = async () => null;

    await createUserController(stubService(), resolve).getProfile(
      req("ghost"), res as never, ((e: unknown) => { nexted = e as { statusCode?: number }; }) as never,
    );

    expect(nexted?.statusCode).toBe(404);
  });
});
