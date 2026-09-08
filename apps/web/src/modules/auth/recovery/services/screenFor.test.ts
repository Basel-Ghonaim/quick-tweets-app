import { describe, expect, it } from "vitest";
import { screenFor } from "./screenFor";
import type { RecoveryPosition } from "../entity";

const at = (step: RecoveryPosition["step"]): RecoveryPosition => ({
  step,
  maskedAddress: step === "request" ? null : "h•••••@example.test",
  resendAvailableIn: 0,
  canResend: true,
});

describe("the screen is the server's answer", () => {
  it("renders each step the position reports", () => {
    for (const step of ["request", "code", "password"] as const) {
      expect(screenFor({ status: "resolved", position: at(step) })).toBe(step);
    }
  });

  it("waits while the answer is in flight rather than guessing one", () => {
    expect(screenFor({ status: "unresolved" })).toBe("pending");
  });
});

describe("a failed read is not an answer", () => {
  /* Collapsing it into `request` would send a reader back to the beginning of
     a recovery the server still holds, losing a code already in their inbox. */
  it("offers a retry, never the first screen", () => {
    expect(screenFor({ status: "failed" })).toBe("retry");
  });
});
