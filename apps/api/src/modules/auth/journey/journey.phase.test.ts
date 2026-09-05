import { describe, expect, it } from "vitest";

import { decideTransition, phaseOf } from "./journey.phase.js";
import type { JourneyMarks, JourneyPhase, JourneyTarget } from "./journey.types.js";

const AT = new Date("2026-09-05T12:00:00.000Z");

const marks = (over: Partial<JourneyMarks> = {}): JourneyMarks => ({
  profileSettledAt: null,
  codeReachedAt: null,
  closedAt: null,
  ...over,
});

describe("the phase a journey derives", () => {
  it("is none when there is no journey at all", () => {
    expect(phaseOf(null)).toBe("none");
  });

  it("starts at profile, where registration leaves the reader", () => {
    expect(phaseOf(marks())).toBe("profile");
  });

  it("is verify once profile is settled", () => {
    expect(phaseOf(marks({ profileSettledAt: AT }))).toBe("verify");
  });

  it("is code once the code screen has been reached", () => {
    expect(phaseOf(marks({ profileSettledAt: AT, codeReachedAt: AT }))).toBe("code");
  });

  it("is code even when profile was skipped, since skipping settles it too", () => {
    expect(phaseOf(marks({ codeReachedAt: AT }))).toBe("code");
  });

  it("is none once closed, whatever else is marked", () => {
    const everything = marks({ profileSettledAt: AT, codeReachedAt: AT, closedAt: AT });

    expect(phaseOf(everything)).toBe("none");
  });

  /* The order is the rule, so the case that proves it is the one where two
     marks disagree: closed must win over reached, or a finished journey would
     answer `code` and hold its reader on the terminal screen forever. */
  it("prefers closed over reached — the order, not the marks, decides", () => {
    expect(phaseOf(marks({ codeReachedAt: AT, closedAt: AT }))).toBe("none");
  });
});

describe("the transitions a journey allows", () => {
  const cases: Array<[JourneyPhase, JourneyTarget, string]> = [
    ["profile", "verify", "settleProfile"],
    ["verify", "code", "reachCode"],
    ["verify", "completed", "close"],
    ["code", "completed", "close"],
  ];

  for (const [phase, to, kind] of cases) {
    it(`moves ${phase} to ${to}`, () => {
      expect(decideTransition(phase, to).kind).toBe(kind);
    });
  }

  it("refuses to skip profile", () => {
    expect(decideTransition("profile", "code").kind).toBe("refused");
    expect(decideTransition("profile", "completed").kind).toBe("refused");
  });

  it("refuses everything when there is no journey", () => {
    expect(decideTransition("none", "verify").kind).toBe("refused");
    expect(decideTransition("none", "code").kind).toBe("refused");
  });

  /* A close that is retried after it succeeded must not error: the response to
     the first attempt is exactly what a flaky network loses. */
  it("treats closing an already-closed journey as a no-op, not a failure", () => {
    expect(decideTransition("none", "completed").kind).toBe("noop");
  });

  it("treats a backwards request as a no-op, so a stale client re-syncs", () => {
    expect(decideTransition("code", "verify").kind).toBe("noop");
    expect(decideTransition("verify", "verify").kind).toBe("noop");
    expect(decideTransition("code", "code").kind).toBe("noop");
  });

  it("never lets a journey leave the code screen except by finishing", () => {
    const targets: JourneyTarget[] = ["verify", "code", "completed"];
    const kinds = targets.map((to) => decideTransition("code", to).kind);

    expect(kinds).toEqual(["noop", "noop", "close"]);
  });
});
