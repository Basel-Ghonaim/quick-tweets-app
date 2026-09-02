import { describe, expect, it } from "vitest";
import { composeEdits } from "./composeEdits";

const typed = { name: "Ada", bio: "hello" };

describe("composeEdits", () => {
  it("carries the reference the upload produced", () => {
    expect(composeEdits(typed, "t0ken")).toEqual({ ...typed, avatarToken: "t0ken" });
  });

  it("carries nothing when no upload succeeded, so a failed picture is absent rather than empty", () => {
    expect(composeEdits(typed, null)).toEqual(typed);
    expect("avatarToken" in composeEdits(typed, null)).toBe(false);
  });

  it("always carries both text fields, so an emptied one is cleared rather than ignored", () => {
    expect(composeEdits({ name: "", bio: "" }, null)).toEqual({ name: "", bio: "" });
  });
});
