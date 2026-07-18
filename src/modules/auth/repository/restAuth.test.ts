/**
 * Characterization of the auth repository's refresh contract (#261, updated #258).
 *
 * `restAuth.refresh` POSTs to `/auth/refresh` and returns the **full session**
 * ({ user, accessToken }) — the server-side source Session Restore uses, with no
 * local persistence. Locked via the repository's injectable client — no DOM, no
 * network.
 */
import { describe, it, expect, vi } from "vitest";
import { restAuth } from "./restAuth";
import type { User } from "@shared/types";

const userDto = {
  id: 1,
  username: "ada",
  name: "Ada Lovelace",
  email: "ada@example.com",
  profileImage: null,
  avatar: null,
  bio: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const expectedUser: User = { ...userDto };

describe("restAuth.refresh — returns the full session (#261, #258)", () => {
  it("POSTs to /auth/refresh (no body) and returns { user, accessToken }", async () => {
    const post = vi
      .fn()
      .mockResolvedValue({ data: { user: userDto, accessToken: "tok-abc" } });
    const repo = restAuth({ post } as unknown as Parameters<typeof restAuth>[0]);

    const session = await repo.refresh();

    expect(post).toHaveBeenCalledWith("/auth/refresh");
    expect(session.accessToken).toBe("tok-abc");
    expect(session.user).toEqual(expectedUser);
  });
});

describe("restAuth.register — upload-then-submit-reference (M6, #256)", () => {
  const file = { name: "a.png" } as unknown as File;
  const creds = {
    username: "ada", name: "Ada Lovelace", email: "ada@example.com",
    password: "Passw0rd!", confirmPassword: "Passw0rd!", privacy: true,
    profileImage: null as File | null,
  };
  const asClient = (post: unknown) => post as Parameters<typeof restAuth>[0];

  it("uploads the avatar and submits { token, grant } as adoption evidence", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { user: { ...userDto, avatar: { token: "TOK" } }, accessToken: "acc" },
    });
    const upload = vi.fn().mockResolvedValue({ token: "TOK", grant: "GRANT" });
    const repo = restAuth(asClient({ post }), upload);

    const session = await repo.register({ ...creds, profileImage: file });

    expect(upload).toHaveBeenCalledWith(file);
    expect(post).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({ username: "ada", avatar: { token: "TOK", grant: "GRANT" } }),
    );
    expect(session.user.avatar).toEqual({ token: "TOK" });
  });

  it("registers without an avatar when none was chosen (no upload)", async () => {
    const post = vi.fn().mockResolvedValue({ data: { user: userDto, accessToken: "acc" } });
    const upload = vi.fn();
    const repo = restAuth(asClient({ post }), upload);

    await repo.register({ ...creds, profileImage: null });

    expect(upload).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith(
      "/auth/register",
      expect.not.objectContaining({ avatar: expect.anything() }),
    );
  });

  it("does not attempt registration when the avatar upload fails (no silent discard)", async () => {
    const post = vi.fn();
    const upload = vi.fn().mockRejectedValue(new Error("upload failed"));
    const repo = restAuth(asClient({ post }), upload);

    await expect(repo.register({ ...creds, profileImage: file })).rejects.toThrow("upload failed");
    expect(post).not.toHaveBeenCalled();
  });
});
