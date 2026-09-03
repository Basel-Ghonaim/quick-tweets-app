import { describe, expect, it, vi } from "vitest";
import { readVerificationStatus } from "./readVerificationStatus";

const selfView = (emailVerification: string) => ({
  data: {
    success: true,
    data: { username: "ada", email: "a@b.c", name: null, bio: "", emailVerification },
  },
});

describe("readVerificationStatus", () => {
  it("asks the canonical current-user resource, resolved from the token", async () => {
    const get = vi.fn(async () => selfView("pending"));

    await readVerificationStatus({ get } as never);

    expect(get).toHaveBeenCalledWith("/users/me");
  });

  it("takes the projection and nothing else, so no user shape is acquired", async () => {
    const client = { get: vi.fn(async () => selfView("proven")) } as never;

    await expect(readVerificationStatus(client)).resolves.toBe("proven");
  });

  it("reads each state the projection can hold", async () => {
    for (const status of ["unproven", "pending", "proven"] as const) {
      const client = { get: vi.fn(async () => selfView(status)) } as never;

      await expect(readVerificationStatus(client)).resolves.toBe(status);
    }
  });
});
