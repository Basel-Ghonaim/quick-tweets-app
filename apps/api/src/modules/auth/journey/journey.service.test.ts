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
  profileOutcome: null,
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
    settleProfile: vi.fn(async () => true),
    reachCode: vi.fn(async () => true),
    close: vi.fn(async () => true),
  };
};

/* The journey asks two questions of a channel it does not own; a stub answers
   both so a test never depends on which one a path happens to reach. */
const probe = (live: boolean, proven: boolean) => ({
  hasLiveChallenge: async () => live,
  hasProvenChannel: async () => proven,
});

const yes = probe(true, false);
const no = probe(false, false);

describe("reading where a reader belongs", () => {
  it("answers none when the account has no journey", async () => {
    const service = createJourneyService(yes, repoOf(null), () => AT);

    await expect(service.stateFor(USER)).resolves.toEqual({
      phase: "none",
      profileOutcome: null,
    });
  });

  it("writes nothing", async () => {
    const repo = repoOf(record());
    const service = createJourneyService(yes, repo, () => AT);

    await service.stateFor(USER);

    expect(repo.settleProfile).not.toHaveBeenCalled();
    expect(repo.reachCode).not.toHaveBeenCalled();
    expect(repo.close).not.toHaveBeenCalled();
  });
});

describe("advancing the journey", () => {
  it("refuses when the account has no journey", async () => {
    const service = createJourneyService(yes, repoOf(null), () => AT);

    await expect(
      service.advance(USER, { to: "verify", outcome: "saved" }),
    ).rejects.toBeInstanceOf(JourneyError);
  });

  it("settles profile and answers with the state that follows", async () => {
    const repo = repoOf(
      record(),
      record({ profileSettledAt: AT, profileOutcome: "saved" }),
    );
    const service = createJourneyService(yes, repo, () => AT);

    await expect(
      service.advance(USER, { to: "verify", outcome: "saved" }),
    ).resolves.toEqual({ phase: "verify", profileOutcome: "saved" });
    expect(repo.settleProfile).toHaveBeenCalledWith(1, AT, "saved");
  });

  /* The two ways out of the profile step differ in exactly one thing, and it is
     the thing the server could not otherwise know. */
  it("records a skip as a skip, not as a settled step alone", async () => {
    const repo = repoOf(
      record(),
      record({ profileSettledAt: AT, profileOutcome: "skipped" }),
    );
    const service = createJourneyService(yes, repo, () => AT);

    await expect(
      service.advance(USER, { to: "verify", outcome: "skipped" }),
    ).resolves.toEqual({ phase: "verify", profileOutcome: "skipped" });
    expect(repo.settleProfile).toHaveBeenCalledWith(1, AT, "skipped");
  });

  it("carries the stored outcome on every later answer", async () => {
    const settled = record({ profileSettledAt: AT, profileOutcome: "skipped" });
    const service = createJourneyService(yes, repoOf(settled), () => AT);

    await expect(service.stateFor(USER)).resolves.toEqual({
      phase: "verify",
      profileOutcome: "skipped",
    });
  });

  it("refuses to skip profile, and writes nothing when it does", async () => {
    const repo = repoOf(record());
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, { to: "code" })).rejects.toBeInstanceOf(
      JourneyError,
    );
    expect(repo.settleProfile).not.toHaveBeenCalled();
  });

  /* The latch is the one state nothing walks back, so it may not be reached
     without something to type into the screen it leads to. */
  it("refuses the code screen when no challenge is live", async () => {
    const repo = repoOf(record({ profileSettledAt: AT }));
    const service = createJourneyService(no, repo, () => AT);

    await expect(service.advance(USER, { to: "code" })).rejects.toBeInstanceOf(
      JourneyError,
    );
    expect(repo.reachCode).not.toHaveBeenCalled();
  });

  it("reaches the code screen when one is", async () => {
    const repo = repoOf(
      record({ profileSettledAt: AT, profileOutcome: "saved" }),
      record({ profileSettledAt: AT, codeReachedAt: AT, profileOutcome: "saved" }),
    );
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, { to: "code" })).resolves.toEqual({
      phase: "code",
      profileOutcome: "saved",
    });
    expect(repo.reachCode).toHaveBeenCalledWith(1, AT);
  });

  it("closes from the ask, recording the step the reader left", async () => {
    const repo = repoOf(record({ profileSettledAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(yes, repo, () => AT);

    await expect(service.advance(USER, { to: "completed" })).resolves.toEqual({
      phase: "none",
      profileOutcome: null,
    });
    expect(repo.close).toHaveBeenCalledWith(1, AT, "verify", "later");
  });

  /* The fact belongs to the capability that owns it, so the journey reads it
     rather than being told, and records what it said at that moment. */
  it("records a proven channel as verified", async () => {
    const repo = repoOf(record({ profileSettledAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(probe(false, true), repo, () => AT);

    await service.advance(USER, { to: "completed" });

    expect(repo.close).toHaveBeenCalledWith(1, AT, "verify", "verified");
  });

  it("records an unproven channel as later, from the code step too", async () => {
    const repo = repoOf(record({ codeReachedAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(probe(false, false), repo, () => AT);

    await service.advance(USER, { to: "completed" });

    expect(repo.close).toHaveBeenCalledWith(1, AT, "code", "later");
  });

  /* Nothing consumes the outcome, and publishing a fact with no consumer would
     widen the surface ahead of a need. */
  it("keeps the outcome off the answer", async () => {
    const repo = repoOf(record({ profileSettledAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(probe(false, true), repo, () => AT);

    await expect(service.advance(USER, { to: "completed" })).resolves.toEqual({
      phase: "none",
      profileOutcome: null,
    });
  });

  it("closes from the code screen, recording that step instead", async () => {
    const repo = repoOf(record({ codeReachedAt: AT }), record({ closedAt: AT }));
    const service = createJourneyService(yes, repo, () => AT);

    await service.advance(USER, { to: "completed" });

    expect(repo.close).toHaveBeenCalledWith(1, AT, "code", "later");
  });

  /* A lost response is exactly what a flaky network takes, so the retry that
     follows it must not be the thing that errors. */
  it("treats a repeated close as a no-op rather than a failure", async () => {
    const repo = repoOf(record({ closedAt: AT }));
    const asked = vi.fn(async () => true);
    const service = createJourneyService(
      { hasLiveChallenge: async () => false, hasProvenChannel: asked },
      repo,
      () => AT,
    );

    await expect(service.advance(USER, { to: "completed" })).resolves.toEqual({
      phase: "none",
      profileOutcome: null,
    });
    expect(repo.close).not.toHaveBeenCalled();
    // A repeat costs no read either: the no-op is decided before the close is.
    expect(asked).not.toHaveBeenCalled();
  });

  it("answers the true phase when a racing tab already moved on", async () => {
    // The write finds the mark already filled; the re-read is what tells the
    // truth, and it says the other tab went further.
    const repo: IJourneyRepository = {
      ...repoOf(
        record(),
        record({ profileSettledAt: AT, codeReachedAt: AT, profileOutcome: "saved" }),
      ),
      settleProfile: vi.fn(async () => false),
    };
    const service = createJourneyService(yes, repo, () => AT);

    await expect(
      service.advance(USER, { to: "verify", outcome: "skipped" }),
    ).resolves.toEqual({ phase: "code", profileOutcome: "saved" });
  });
});
