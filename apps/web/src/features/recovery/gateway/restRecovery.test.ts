/**
 * What each call puts on the wire. The bodies are the assertions that matter:
 * the address is the position's on a resend, and the credential is the
 * position's on an apply, so neither may travel from here.
 */

import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import { restRecovery } from "./restRecovery";
import type { RecoveryPositionDto } from "./recoveryDto";
import type { RecoveryPosition } from "../model";

const ANSWER: RecoveryPositionDto = {
  step: "code",
  maskedEndpoint: "h•••••@example.test",
  retryAfterSeconds: 60,
  canResend: true,
};

const POSITION: RecoveryPosition = {
  step: "code",
  maskedAddress: "h•••••@example.test",
  resendAvailableIn: 60,
  canResend: true,
};

const stub = () => {
  const get = vi.fn().mockResolvedValue({ data: { success: true, data: ANSWER } });
  const post = vi.fn().mockResolvedValue({ data: { success: true, data: ANSWER } });
  return { client: { get, post } as unknown as AxiosInstance, get, post };
};

describe("the position read", () => {
  it("asks the session endpoint and unwraps the envelope", async () => {
    const { client, get } = stub();

    await expect(restRecovery(client).position()).resolves.toEqual(POSITION);
    expect(get).toHaveBeenCalledWith("/auth/password-reset/session");
  });
});

describe("what each call sends", () => {
  it("requests with the address the reader typed", async () => {
    const { client, post } = stub();

    await restRecovery(client).request("someone@example.test");

    expect(post).toHaveBeenCalledWith("/auth/password-reset", {
      email: "someone@example.test",
    });
  });

  /* An empty object, not an absent body: the server refuses one that never
     parsed as JSON, which is what keeps a cross-site form post out. */
  it("resends with an empty body, carrying no address", async () => {
    const { client, post } = stub();

    await restRecovery(client).resend();

    expect(post).toHaveBeenCalledWith("/auth/password-reset/resend", {});
  });

  it("confirms with the code and nothing else", async () => {
    const { client, post } = stub();

    await restRecovery(client).confirm("7QK3MNP2XVZB");

    expect(post).toHaveBeenCalledWith("/auth/password-reset/confirm", {
      code: "7QK3MNP2XVZB",
    });
  });

  /* A code supplied here is refused rather than ignored, so sending one would
     turn every reset into a 422. */
  it("applies with the new password and no code", async () => {
    const { client, post } = stub();

    await restRecovery(client).apply("N3wPassw0rd!");

    expect(post).toHaveBeenCalledWith("/auth/password-reset/apply", {
      newPassword: "N3wPassw0rd!",
    });
    expect(JSON.stringify(post.mock.calls[0])).not.toContain("code");
  });
});

describe("every answer that carries a position returns it", () => {
  it("hands back what request and resend answered, rather than re-reading", async () => {
    const { client } = stub();
    const repo = restRecovery(client);

    await expect(repo.request("a@example.test")).resolves.toEqual(POSITION);
    await expect(repo.resend()).resolves.toEqual(POSITION);
  });
});
