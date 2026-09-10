import { describe, expect, it, vi } from "vitest";
import { completeReset } from "./completeReset";
import { sessionActions } from "@features/session";

describe("completing a reset", () => {
  it("clears the local session once the password is written", async () => {
    const dispatch = vi.fn();

    await completeReset(dispatch, async () => {});

    expect(dispatch).toHaveBeenCalledWith(sessionActions.sessionEnded());
  });

  /* A failed apply leaves the reader signed in and on the screen that can
     report it; signing them out would hide a password that never changed. */
  it("leaves the session alone when the password was not written", async () => {
    const dispatch = vi.fn();

    await expect(
      completeReset(dispatch, () => Promise.reject(new Error("refused"))),
    ).rejects.toThrow("refused");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
