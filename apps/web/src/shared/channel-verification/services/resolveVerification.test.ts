import { describe, expect, it } from "vitest";
import { resolveVerification } from "./resolveVerification";
import type { VerificationGateway } from "../gateway";

const AT = 1_700_000_060_000;

const repoThat = (current: VerificationGateway["current"]): VerificationGateway => ({
  current,
  issue: async () => ({ resendAvailableAt: null }),
  confirm: async () => {},
});

describe("resolving where the holder stands", () => {
  it("carries the server's answer through", async () => {
    const position = { status: "pending" as const, resendAvailableAt: AT };

    await expect(resolveVerification(repoThat(async () => position))).resolves.toEqual({
      status: "resolved",
      position,
    });
  });

  it("reports a failed read as failed, never as nothing outstanding", async () => {
    const failing = repoThat(async () => {
      throw new Error("offline");
    });

    await expect(resolveVerification(failing)).resolves.toEqual({ status: "failed" });
  });
});
