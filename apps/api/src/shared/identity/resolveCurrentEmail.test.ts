import { describe, expect, it, vi } from "vitest";

import { resolveCurrentEmail } from "./resolveCurrentEmail.js";

const fakeDb = (email: string | null) => ({
  user: {
    findUnique: vi.fn().mockResolvedValue(email === null ? null : { email }),
  },
});

describe("resolveCurrentEmail", () => {
  it("returns the account's current email", async () => {
    const db = fakeDb("holder@example.test");

    await expect(resolveCurrentEmail(7, db as never)).resolves.toBe("holder@example.test");
  });

  it("looks the account up by id and selects only the email", async () => {
    const db = fakeDb("holder@example.test");

    await resolveCurrentEmail(7, db as never);

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { email: true },
    });
  });

  it("returns null for an account that does not exist, rather than inventing a value", async () => {
    await expect(resolveCurrentEmail(999, fakeDb(null) as never)).resolves.toBeNull();
  });
});
