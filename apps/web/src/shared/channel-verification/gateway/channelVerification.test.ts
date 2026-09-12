import { describe, expect, it, vi } from "vitest";
import { confirmChallenge, currentChallenge, issueChallenge } from "./channelVerification";

const issued = {
  data: { success: true, data: { delivery: "accepted", resendAvailableInSeconds: 60 } },
};

const standing = { data: { success: true, data: { status: "pending", resendAvailableInSeconds: 42 } } };

const clientThatCaptures = () => {
  const calls: { url: string; body?: unknown }[] = [];
  return {
    calls,
    client: {
      post: vi.fn(async (url: string, body?: unknown) => {
        calls.push({ url, body });
        return issued;
      }),
      get: vi.fn(async (url: string) => {
        calls.push({ url });
        return standing;
      }),
    } as never,
  };
};

describe("currentChallenge", () => {
  it("asks for the holder’s own standing, with no body and no parameters", async () => {
    const { calls, client } = clientThatCaptures();

    await currentChallenge(client);

    expect(calls[0].url).toBe("/channel-verification/challenges/current");
    expect(calls[0].body).toBeUndefined();
  });

  it("answers the status and what is left of the window", async () => {
    const { client } = clientThatCaptures();

    await expect(currentChallenge(client)).resolves.toEqual({
      status: "pending",
      resendAvailableInSeconds: 42,
    });
  });
});

describe("issueChallenge", () => {
  it("sends no body, so the subject is the token's account and never the caller's claim", async () => {
    const { calls, client } = clientThatCaptures();

    await issueChallenge(client);

    expect(calls[0].url).toBe("/channel-verification/challenges");
    expect(calls[0].body).toBeUndefined();
  });

  it("returns what the send is known to have achieved, and when a resend is allowed", async () => {
    const { client } = clientThatCaptures();

    await expect(issueChallenge(client)).resolves.toEqual({
      delivery: "accepted",
      resendAvailableInSeconds: 60,
    });
  });
});

describe("confirmChallenge", () => {
  it("sends the code and nothing else", async () => {
    const { calls, client } = clientThatCaptures();

    await confirmChallenge("7QK3MNP2XVZB", client);

    expect(calls[0].url).toBe("/channel-verification/challenges/confirm");
    expect(calls[0].body).toEqual({ code: "7QK3MNP2XVZB" });
  });
});
