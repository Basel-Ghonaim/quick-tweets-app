import { describe, expect, it, vi } from "vitest";

import { JourneyError } from "./journey.errors.js";
import { createJourneyService } from "./journey.service.js";
import type { IJourneyRepository, JourneyRecord } from "./journey.types.js";

const AT = new Date("2026-09-05T12:00:00.000Z");
const USER = 7;

const record = (over: Partial<JourneyRecord> = {}): JourneyRecord => ({
  id: 1,
  userId: USER,
  profileSettledAt: null,
  codeReachedAt: null,
  closedAt: null,
  ...over,
});

/**
 * The repository as a script of successive reads: the service re-reads after a
 * write, so a test that returned one fixed row could not tell a truthful answer
 * from an assumed one.
 */
const repoOf = (...reads: Array<JourneyRecord | null>): IJourneyRepository => {
  const queue = [...reads];
  return {
    create: vi.fn(async () => {}),
    findByUserId: vi.fn(async () => (queue.length > 1 ? queue.shift()! : queue[0]!)),
    fillMark: vi.fn(async () => true),
    close: vi.fn(async () => true),
  };
};

const yes = async () => true;
const no = async () => false;

describe("reading where a reader belongs", () => {
  it("answers none when the account has no journey", async () => {
    const service = createJourneyService(yes, repoOf(null), () => AT);

    await expect(service.phaseFor(USER)).resolves.toBe("none");
  });

  it("writes nothing", async () => {
    const repo = repoOf(record());
    const service = createJourneyService(yes, repo, () => AT);

    await service.phaseFor(USER);

    expect(repo.fillMark).not.toHaveBeenCalled();
    expect(repo.close).not.toHaveBeenCalled();
  });
});

describe("advancing the journey", () => {
  it("refuses when the account has no journey", async () => {
    const service = createJourneyService(yes, repoOf(null), () => AT);

    await expect(service.advance(USER, "verify")).rejects.toBeInstanceOf(JourneyError);
  });

  it("settles profile and answers with the phase that follows", async () => {
    const repo = repoOf(record(), record({ profileSettledAt: AT }));
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, "verify")).resolves.toBe("verify");
    expect(repo.fillMark).toHaveBeenCalledWith(1, "profileSettledAt", AT);
  });

  it("refuses to skip profile, and writes nothing when it does", async () => {
    const repo = repoOf(record());
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, "code")).rejects.toBeInstanceOf(JourneyError);
    expect(repo.fillMark).not.toHaveBeenCalled();
  });

  /* The latch is the one state nothing walks back, so it may not be reached
     without something to type into the screen it leads to. */
  it("refuses the code screen when no challenge is live", async () => {
    const repo = repoOf(record({ profileSettledAt: AT }));
    const service = createJourneyService(no, repo, () => AT);

    await expect(service.advance(USER, "code")).rejects.toBeInstanceOf(JourneyError);
    expect(repo.fillMark).not.toHaveBeenCalled();
  });

  it("reaches the code screen when one is", async () => {
    const repo = repoOf(
      record({ profileSettledAt: AT }),
      record({ profileSettledAt: AT, codeReachedAt: AT }),
    );
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, "code")).resolves.toBe("code");
    expect(repo.fillMark).toHaveBeenCalledWith(1, "codeReachedAt", AT);
  });

  it("closes from the ask, recording the step the reader left", async () => {
    const repo = repoOf(record({ profileSettledAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, "completed")).resolves.toBe("none");
    expect(repo.close).toHaveBeenCalledWith(1, AT, "verify");
  });

  it("closes from the code screen, recording that step instead", async () => {
    const repo = repoOf(record({ codeReachedAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(yes, repo, () => AT);

    await service.advance(USER, "completed");

    expect(repo.close).toHaveBeenCalledWith(1, AT, "code");
  });

  /* A lost response is exactly what a flaky network takes, so the retry that
     follows it must not be the thing that errors. */
  it("treats a repeated close as a no-op rather than a failure", async () => {
    const repo = repoOf(record({ closedAt: AT }));
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, "completed")).resolves.toBe("none");
    expect(repo.close).not.toHaveBeenCalled();
  });

  it("answers the true phase when a racing tab already moved on", async () => {
    // The write finds the mark already filled; the re-read is what tells the
    // truth, and it says the other tab went further.
    const repo: IJourneyRepository = {
      ...repoOf(record(), record({ profileSettledAt: AT, codeReachedAt: AT })),
      fillMark: vi.fn(async () => false),
    };
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, "verify")).resolves.toBe("code");
  });
});
