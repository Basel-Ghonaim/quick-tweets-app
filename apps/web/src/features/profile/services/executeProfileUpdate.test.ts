import { describe, expect, it, vi } from "vitest";
import { createAppError } from "@shared/errors";
import type { RequestState } from "@shared/types";
import { CATALOGUES } from "@shared/copy";
import { executeProfileUpdate } from "./executeProfileUpdate";

const profile = { username: "ada", name: "Ada", bio: "hello" };
const words = CATALOGUES.en.auth.profile;

const track = () => {
  const seen: RequestState[] = [];
  return { seen, set: vi.fn((next: RequestState) => seen.push(next)) };
};

describe("executeProfileUpdate", () => {
  it("reports the attempt through the state it was handed, and nothing else", async () => {
    const { seen, set } = track();

    await executeProfileUpdate(set, async () => profile, words);

    expect(seen.map((s) => s.status)).toEqual(["loading", "success"]);
  });

  it("leaves the state at the failure rather than at rest, and re-raises", async () => {
    const { seen, set } = track();
    const failing = vi.fn(async () => {
      throw createAppError("validation", "raw");
    });

    await expect(executeProfileUpdate(set, failing, words)).rejects.toThrow();

    expect(seen.map((s) => s.status)).toEqual(["loading", "error"]);
  });

  it("surfaces a failure as wording rather than the raw message", async () => {
    const { seen, set } = track();

    await expect(
      executeProfileUpdate(set, async () => {
        throw createAppError("validation", "raw");
      }, words),
    ).rejects.toThrow();

    expect(seen.at(-1)?.error?.message).not.toBe("raw");
  });
});
