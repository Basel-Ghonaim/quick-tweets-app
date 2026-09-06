import { describe, expect, it, vi } from "vitest";

import { restJourney } from "./restJourney";

const envelope = (data: unknown) => ({ data: { success: true, data } });

describe("the journey's transport", () => {
  it("reads the state the server answers", async () => {
    const get = vi.fn(async () => envelope({ phase: "verify", profileOutcome: "skipped" }));
    const repo = restJourney({ get } as never);

    await expect(repo.read()).resolves.toEqual({
      phase: "verify",
      profileOutcome: "skipped",
    });
    expect(get).toHaveBeenCalledWith("/onboarding/journey");
  });

  it("sends the move as given, outcome included", async () => {
    const post = vi.fn(async () => envelope({ phase: "verify", profileOutcome: "saved" }));
    const repo = restJourney({ post } as never);

    await repo.advance({ to: "verify", outcome: "saved" });

    expect(post).toHaveBeenCalledWith("/onboarding/journey/advance", {
      to: "verify",
      outcome: "saved",
    });
  });
});
