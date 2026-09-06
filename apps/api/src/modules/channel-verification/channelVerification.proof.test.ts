import { describe, expect, it, vi } from "vitest";

import { createChannelVerificationProof } from "./channelVerification.proof.js";
import type { IChannelVerificationRepository } from "./channelVerification.types.js";

const AT = new Date("2026-09-06T12:00:00.000Z");
const LATER = new Date("2026-09-06T13:00:00.000Z");

const repoOf = (provenAt: Date | null) =>
  ({
    upsertRecord: vi.fn(async () => ({ id: 7, userId: 1, endpoint: "h@x.test", provenAt })),
    markProven: vi.fn(async () => {}),
  }) as unknown as IChannelVerificationRepository;

describe("a proof from evidence obtained elsewhere", () => {
  it("records it against the endpoint the evidence names", async () => {
    const repo = repoOf(null);
    await createChannelVerificationProof(repo, () => AT).fromDeliveredCode(1, "h@x.test");

    expect(repo.upsertRecord).toHaveBeenCalledWith({ userId: 1, endpoint: "h@x.test" });
    expect(repo.markProven).toHaveBeenCalledWith({ verificationId: 7, provenAt: AT });
  });

  /* A second demonstration does not make the first one later, so an endpoint
     already proven keeps the time it was proven at. */
  it("leaves an already-proven endpoint exactly as it stands", async () => {
    const repo = repoOf(AT);
    await createChannelVerificationProof(repo, () => LATER).fromDeliveredCode(1, "h@x.test");

    expect(repo.markProven).not.toHaveBeenCalled();
  });
});
