import { describe, expect, it } from "vitest";
import { profileMapper } from "./profileMapper";

const { editsToDto } = profileMapper();

describe("editsToDto — the two fields clear in opposite ways", () => {
  it("clears a name with null, which the server accepts, and never with an empty string, which it rejects", () => {
    expect(editsToDto({ name: "" })).toEqual({ name: null });
    expect(editsToDto({ name: "   " })).toEqual({ name: null });
  });

  it("clears a bio with an empty string, since the field is not nullable", () => {
    expect(editsToDto({ bio: "" })).toEqual({ bio: "" });
    expect(editsToDto({ bio: "   " })).toEqual({ bio: "" });
  });

  it("sends what was typed, trimmed", () => {
    expect(editsToDto({ name: " Ada ", bio: " hello " })).toEqual({ name: "Ada", bio: "hello" });
  });

  it("carries the avatar as a reference, never as bytes", () => {
    expect(editsToDto({ avatarToken: "t0ken" })).toEqual({ avatar: { token: "t0ken" } });
  });

  it("omits what the reader left alone, so an untouched field is never overwritten", () => {
    expect(editsToDto({ bio: "only" })).toEqual({ bio: "only" });
    expect(editsToDto({})).toEqual({});
  });
});
