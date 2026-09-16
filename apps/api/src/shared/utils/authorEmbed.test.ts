// The author embed: only a resolved avatar token reaches the wire (ADR 0005 Decision 3).

import { describe, expect, it } from "vitest";

import { avatarReferencesOf, toAuthorEmbed, type AuthorRow } from "./authorEmbed";

const author = (avatarMediaId: number | null): AuthorRow => ({
  id: 7,
  username: "ada",
  name: "Ada",
  avatarMediaId,
});

describe("toAuthorEmbed", () => {
  it("carries the resolved avatar token", () => {
    expect(toAuthorEmbed(author(90), new Map([[90, "tok-90"]])).avatar).toEqual({ token: "tok-90" });
  });

  it("is null when the author has no avatar", () => {
    expect(toAuthorEmbed(author(null), new Map([[90, "tok-90"]])).avatar).toBeNull();
  });

  it("is null when the avatar reference did not resolve", () => {
    expect(toAuthorEmbed(author(90), new Map()).avatar).toBeNull();
  });

  it("exposes the token and never the reference", () => {
    const embed = toAuthorEmbed(author(90), new Map([[90, "tok-90"]]));

    expect(Object.keys(embed).sort()).toEqual(["avatar", "id", "name", "username"]);
  });
});

describe("avatarReferencesOf", () => {
  it("collects the references authors hold, skipping authors with none", () => {
    expect(avatarReferencesOf([author(90), author(null), author(91)])).toEqual([90, 91]);
  });
});
