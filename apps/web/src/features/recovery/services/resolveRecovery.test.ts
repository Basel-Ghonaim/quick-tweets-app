import { describe, expect, it } from "vitest";
import { resolveRecovery } from "./resolveRecovery";
import type { RecoveryPosition } from "../entity";
import type { RecoveryRepository } from "../repository";

const POSITION: RecoveryPosition = {
  step: "password",
  maskedAddress: "h•••••@example.test",
  resendAvailableIn: 0,
  canResend: false,
};

const repo = (position: () => Promise<RecoveryPosition>): RecoveryRepository => ({
  position,
  request: async () => POSITION,
  resend: async () => POSITION,
  confirm: async () => {},
  apply: async () => {},
});

describe("resolving the position", () => {
  it("carries the server's answer through untouched", async () => {
    const read = await resolveRecovery(repo(async () => POSITION));

    expect(read).toEqual({ status: "resolved", position: POSITION });
  });

  /* One state for every way it can fail: the read never 404s and produces no
     401, so there is nothing to distinguish. */
  it("reports a failure as a failure, never as a position", async () => {
    const read = await resolveRecovery(
      repo(async () => {
        throw new Error("network");
      }),
    );

    expect(read).toEqual({ status: "failed" });
  });
});
