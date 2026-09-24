/**
 * The edit limiter, driven directly with a fake request and response: the budget is the
 * limiter's to decide, so no route, server or database is needed to prove it.
 */

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";

import { editLimiter } from "./rateLimiter";

type Outcome = { passed: true } | { passed: false; status: number; body: unknown; retryAfter: unknown };

// The limiter's memory is shared by every test in this file, so each test edits as its own account.
let nextAccount = 1_000;
const freshAccount = () => ++nextAccount;

const edit = (userId: number, ip = "203.0.113.1") =>
  new Promise<Outcome>((resolve) => {
    const headers: Record<string, unknown> = {};
    const req = { userId, ip, headers: {}, method: "PATCH", app: { get: () => false } };
    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader: (name: string, value: unknown) => {
        headers[name.toLowerCase()] = value;
      },
      getHeader: (name: string) => headers[name.toLowerCase()],
      append: () => undefined,
      on: () => undefined,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(body: unknown) {
        resolve({ passed: false, status: this.statusCode, body, retryAfter: headers["retry-after"] });
        return this;
      },
      json(body: unknown) {
        return this.send(body);
      },
    };
    const next: NextFunction = () => resolve({ passed: true });
    void editLimiter(req as unknown as Request, res as unknown as Response, next);
  });

const editTimes = async (userId: number, times: number, ip?: string) => {
  const outcomes: Outcome[] = [];
  for (let i = 0; i < times; i++) outcomes.push(await edit(userId, ip));
  return outcomes;
};

describe("editLimiter — ten edits an hour, per account", () => {
  it("lets an account edit ten times", async () => {
    const outcomes = await editTimes(freshAccount(), 10);

    expect(outcomes.every((o) => o.passed)).toBe(true);
  });

  it("refuses the eleventh with its own type, and says when to try again", async () => {
    const account = freshAccount();
    await editTimes(account, 10);

    const eleventh = await edit(account);

    expect(eleventh).toMatchObject({
      passed: false,
      status: 429,
      body: {
        success: false,
        error: {
          type: "edit_rate_limit",
          message: "You have edited posts too often. Please wait and try again later.",
        },
      },
    });
    expect(Number((eleventh as { retryAfter: unknown }).retryAfter)).toBeGreaterThan(0);
  });

  it("cannot be escaped by changing address", async () => {
    const account = freshAccount();
    await editTimes(account, 10, "203.0.113.1");

    expect((await edit(account, "198.51.100.7")).passed).toBe(false);
  });

  it("leaves another account's budget alone, even from the same address", async () => {
    const spent = freshAccount();
    await editTimes(spent, 11);

    expect((await edit(freshAccount())).passed).toBe(true);
  });
});
