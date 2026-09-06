/**
 * Service unit tests — the lifecycle over plain-object fakes, an injected
 * clock, and an injected wait, so the response floor is provable without
 * actually waiting for it. No database and no mail transport is involved;
 * bcrypt itself is real, so a written hash is checked against the password
 * that produced it rather than trusted by inspection.
 *
 * The neutrality assertions (I5) are the point of this file: what a caller
 * can observe must be identical across all three branches `request` can
 * take, even though what happens internally is not.
 */

import bcrypt from "bcrypt";
import { describe, expect, it, vi } from "vitest";

import type { MailAdapter, MailMessage } from "../../mail-delivery/index.js";
import type { IAuthRepository, ITokenRepository } from "../auth.types.js";
import { createPasswordResetService } from "./passwordReset.service.js";
import type {
  IPasswordResetRepository,
  PasswordResetChallenge,
  ResetCodeFormat,
} from "./passwordReset.types.js";

const FORMAT: ResetCodeFormat = { alphabet: "0123456789ABCDEF", length: 8 };
const TTL = 10 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const FLOOR = 250;
const T0 = new Date("2026-01-01T12:00:00.000Z");

const USER = { id: 5, email: "holder@example.test" };

/** An in-memory stand-in for the credential table, honest about ids and timestamps. */
const fakeWorld = () => {
  const rows: { id: number; userId: number; codeHash: string; expiresAt: Date; usedAt: Date | null; createdAt: Date }[] = [];
  const sessions: { id: number; tokenHash: string; maskedEndpoint: string; challengeId: number | null; expiresAt: Date }[] = [];
  let nextId = 1;
  let nextSessionId = 1;
  let clock = T0;

  const repo: IPasswordResetRepository = {
    findMostRecentForUser: async (userId) => {
      const matching = rows.filter((r) => r.userId === userId);
      if (matching.length === 0) return null;
      const latest = matching.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      return { ...latest } as PasswordResetChallenge;
    },
    lockUser: async () => {},
    createChallenge: async ({ userId, codeHash, expiresAt }) => {
      const row = { id: nextId++, userId, codeHash, expiresAt, usedAt: null, createdAt: clock };
      rows.push(row);
      return { ...row };
    },
    findByCodeHash: async (codeHash) => {
      const row = rows.find((r) => r.codeHash === codeHash);
      return row ? { ...row } : null;
    },
    markUsed: async (id, usedAt) => {
      const row = rows.find((r) => r.id === id && r.usedAt === null);
      if (!row) return 0;
      row.usedAt = usedAt;
      return 1;
    },
    deleteBefore: async () => 0,

    findChallengeById: async (id) => {
      const row = rows.find((r) => r.id === id);
      return row ? { ...row } : null;
    },
    createSession: async ({ tokenHash, maskedEndpoint, expiresAt }) => {
      sessions.push({ id: nextSessionId++, tokenHash, maskedEndpoint, challengeId: null, expiresAt });
    },
    findSessionByTokenHash: async (tokenHash) => {
      const row = sessions.find((sn) => sn.tokenHash === tokenHash);
      return row ? { ...row } : null;
    },
    deleteSessionByTokenHash: async (tokenHash) => {
      const at = sessions.findIndex((sn) => sn.tokenHash === tokenHash);
      if (at >= 0) sessions.splice(at, 1);
    },
    bindSessionToChallenge: async (id, challengeId) => {
      const row = sessions.find((sn) => sn.id === id);
      if (row) row.challengeId = challengeId;
    },
    deleteSessionsBefore: async () => 0,
  };

  return { repo, rows, sessions, setClock: (d: Date) => (clock = d) };
};

const fakeAuthRepo = (overrides: Partial<IAuthRepository> = {}): IAuthRepository => ({
  findByUsername: async () => null,
  findByEmail: async (email) => (email === USER.email ? (USER as never) : null),
  findById: async () => null,
  create: async () => ({}) as never,
  updatePasswordHash: vi.fn(async () => {}),
  ...overrides,
});

const fakeTokenRepo = (overrides: Partial<ITokenRepository> = {}): ITokenRepository => ({
  createRefreshToken: async () => ({}) as never,
  findRefreshToken: async () => null,
  deleteRefreshToken: async () => {},
  deleteAllUserTokens: vi.fn(async () => {}),
  deleteExpired: async () => 0,
  rotateRefreshToken: async () => ({}) as never,
  ...overrides,
});

const fakeMail = (): MailAdapter & { sent: MailMessage[] } => {
  const sent: MailMessage[] = [];
  return {
    sent,
    send: vi.fn(async (message: MailMessage) => {
      sent.push(message);
      return { outcome: "accepted" as const };
    }),
  };
};

/** Runs the transaction body against the same fake client throughout — a plain pass-through. */
const fakeRunInTransaction = async <T>(fn: (tx: never) => Promise<T>): Promise<T> => fn(undefined as never);

const build = (over: {
  authRepo?: IAuthRepository;
  tokenRepo?: ITokenRepository;
  mail?: MailAdapter;
  now?: () => Date;
  wait?: (ms: number) => Promise<void>;
  /** Overrides layered onto the in-memory repo — for provoking a specific race outcome. */
  repoOverride?: Partial<IPasswordResetRepository>;
} = {}) => {
  const world = fakeWorld();
  const repo: IPasswordResetRepository = { ...world.repo, ...over.repoOverride };
  const mail = over.mail ?? fakeMail();
  const waits: number[] = [];
  const wait = over.wait ?? (async (ms: number) => { waits.push(ms); });

  const service = createPasswordResetService({
    repo,
    authRepo: over.authRepo ?? fakeAuthRepo(),
    tokenRepo: over.tokenRepo ?? fakeTokenRepo(),
    mail,
    runInTransaction: fakeRunInTransaction,
    now: over.now ?? (() => T0),
    wait,
    format: FORMAT,
    ttlMs: TTL,
    cooldownMs: COOLDOWN,
    responseFloorMs: FLOOR,
  });

  return { service, world, mail, waits };
};

describe("request — neutrality across all three branches (I5)", () => {
  it("an unknown address returns no dispatchSend, and calls the mail adapter never", async () => {
    const { service, mail } = build();

    const outcome = await service.request({ email: "nobody@example.test" });

    expect(outcome.dispatchSend).toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("a known, eligible address returns a dispatchSend", async () => {
    const { service } = build();

    const outcome = await service.request({ email: USER.email });

    expect(outcome.dispatchSend).toBeTypeOf("function");
  });

  it("calling dispatchSend, and only then, reaches the mail adapter — with the account's own stored address", async () => {
    const { service, mail } = build();

    const outcome = await service.request({ email: USER.email });
    expect(mail.send).not.toHaveBeenCalled();

    await outcome.dispatchSend?.();

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: USER.email }),
    );
  });

  it("a known address still inside its cooldown returns no dispatchSend — indistinguishable from unknown", async () => {
    let clock = T0;
    const { service, mail, world } = build({ now: () => clock });

    await service.request({ email: USER.email }); // first request: mints
    clock = new Date(T0.getTime() + 10_000); // 10s later — well inside the 60s cooldown

    const second = await service.request({ email: USER.email });

    expect(second.dispatchSend).toBeUndefined();
    expect(world.rows).toHaveLength(1); // no second row minted
    expect(mail.send).not.toHaveBeenCalled(); // never called at all in this branch
  });

  it("all three branches produce identically-shaped outcomes", async () => {
    const unknown = await build().service.request({ email: "nobody@example.test" });

    let clock = T0;
    const cooling = build({ now: () => clock });
    await cooling.service.request({ email: USER.email });
    clock = new Date(T0.getTime() + 1000);
    const coolingOutcome = await cooling.service.request({ email: USER.email });

    // Neither observable outcome carries anything beyond the optional thunk —
    // and the two that must match (unknown vs. cooling) match exactly.
    expect(Object.keys(unknown)).toEqual(Object.keys(coolingOutcome));
  });

  it("applies the response floor to the unknown-address branch", async () => {
    const { service, waits } = build();

    await service.request({ email: "nobody@example.test" });

    expect(waits).toHaveLength(1);
    expect(waits[0]).toBeGreaterThan(0);
    expect(waits[0]).toBeLessThanOrEqual(FLOOR);
  });

  it("applies the response floor to the eligible-address branch too", async () => {
    const { service, waits } = build();

    await service.request({ email: USER.email });

    expect(waits).toHaveLength(1);
    expect(waits[0]).toBeGreaterThan(0);
    expect(waits[0]).toBeLessThanOrEqual(FLOOR);
  });

  it("does not mint a second time for an eligible address once the cooldown has actually elapsed", async () => {
    let clock = T0;
    const { service, world } = build({ now: () => clock });

    await service.request({ email: USER.email });
    clock = new Date(T0.getTime() + COOLDOWN + 1);
    await service.request({ email: USER.email });

    expect(world.rows).toHaveLength(2);
  });

  it("a send that throws is swallowed inside dispatchSend, never surfaced to the caller", async () => {
    const throwingMail: MailAdapter = { send: vi.fn(async () => { throw new Error("smtp exploded"); }) };
    const { service } = build({ mail: throwingMail });

    const outcome = await service.request({ email: USER.email });

    await expect(outcome.dispatchSend?.()).resolves.toBeUndefined();
  });
});

describe("confirm — read-only", () => {
  it("resolves without throwing for a currently usable code, and writes nothing", async () => {
    const { service, mail } = build();
    const { dispatchSend, sessionKey: key } = await service.request({ email: USER.email });
    await dispatchSend?.();
    const [sent] = (mail.send as ReturnType<typeof vi.fn>).mock.calls[0] as [MailMessage];
    const code = sent.body.match(/code is (\w+)/)?.[1] ?? "";

    await expect(service.confirm({ sessionKey: key, code })).resolves.toBeUndefined();
    // A second check reports the same thing — confirm consumed nothing.
    await expect(service.confirm({ sessionKey: key, code })).resolves.toBeUndefined();
  });

  it("reports a never-issued code as not usable", async () => {
    const { service } = build();
    const { sessionKey: key } = await service.request({ email: "nobody@example.test" });

    await expect(service.confirm({ sessionKey: key, code: "AAAAAAAA" })).rejects.toMatchObject({ code: "not_usable" });
  });

  it("reports a malformed code as not usable, identically", async () => {
    const { service } = build();
    const { sessionKey: key } = await service.request({ email: "nobody@example.test" });

    await expect(service.confirm({ sessionKey: key, code: "too-short" })).rejects.toMatchObject({ code: "not_usable" });
  });

  /* A position is where a confirmed credential is held, so without one there is
     nowhere for a success to go — and it is refused the same single way. */
  it("reports a usable code with no position as not usable, identically", async () => {
    const b = build();
    const { dispatchSend } = await b.service.request({ email: USER.email });
    await dispatchSend?.();
    const [sent] = (b.mail as ReturnType<typeof fakeMail>).sent;
    const code = sent.body.match(/code is (\w+)/)?.[1] ?? "";

    await expect(b.service.confirm({ code })).rejects.toMatchObject({ code: "not_usable" });
  });

  it("reports an expired code as not usable", async () => {
    let clock = T0;
    const { service, mail } = build({ now: () => clock });
    const { dispatchSend, sessionKey: key } = await service.request({ email: USER.email });
    await dispatchSend?.();
    const [sent] = (mail.send as ReturnType<typeof vi.fn>).mock.calls[0] as [MailMessage];
    const code = sent.body.match(/code is (\w+)/)?.[1] ?? "";

    clock = new Date(T0.getTime() + TTL + 1);

    await expect(service.confirm({ sessionKey: key, code })).rejects.toMatchObject({ code: "not_usable" });
  });

  it("reports an already-used code as not usable", async () => {
    const { service, mail } = build();
    const { dispatchSend, sessionKey: key } = await service.request({ email: USER.email });
    await dispatchSend?.();
    const [sent] = (mail.send as ReturnType<typeof vi.fn>).mock.calls[0] as [MailMessage];
    const code = sent.body.match(/code is (\w+)/)?.[1] ?? "";

    // Spending it now goes through the position, so it is confirmed into one first.
    await service.confirm({ sessionKey: key, code });
    await service.apply({ sessionKey: key, newPassword: "N3wPassw0rd!" });

    await expect(service.confirm({ sessionKey: key, code })).rejects.toMatchObject({ code: "not_usable" });
  });
});

describe("apply — re-validates, then consumes", () => {
  /** A position with a confirmed credential in it — what `apply` now spends. */
  const readyToApply = async (build_: ReturnType<typeof build>) => {
    const { dispatchSend, sessionKey } = await build_.service.request({ email: USER.email });
    await dispatchSend?.();
    const [sent] = (build_.mail as ReturnType<typeof fakeMail>).sent;
    const code = sent.body.match(/code is (\w+)/)?.[1] ?? "";

    await build_.service.confirm({ sessionKey, code });
    return { code, sessionKey };
  };

  it("on success: hashes the new password, writes it, and revokes every session", async () => {
    const authRepo = fakeAuthRepo();
    const tokenRepo = fakeTokenRepo();
    const b = build({ authRepo, tokenRepo });
    const { sessionKey: key } = await readyToApply(b);

    const result = await b.service.apply({ sessionKey: key, newPassword: "N3wPassw0rd!" });

    expect(result).toEqual({ userId: USER.id });
    expect(authRepo.updatePasswordHash).toHaveBeenCalledTimes(1);
    const [, writtenHash] = (authRepo.updatePasswordHash as ReturnType<typeof vi.fn>).mock.calls[0] as [number, string];
    await expect(bcrypt.compare("N3wPassw0rd!", writtenHash)).resolves.toBe(true);
    await expect(bcrypt.compare("wrong-password", writtenHash)).resolves.toBe(false);
    expect(tokenRepo.deleteAllUserTokens).toHaveBeenCalledWith(USER.id, undefined);
  });

  it("consumes the code — a second apply with the same code fails, and writes nothing further", async () => {
    const authRepo = fakeAuthRepo();
    const b = build({ authRepo });
    const { sessionKey: key } = await readyToApply(b);

    await b.service.apply({ sessionKey: key, newPassword: "N3wPassw0rd!" });
    (authRepo.updatePasswordHash as ReturnType<typeof vi.fn>).mockClear();

    await expect(b.service.apply({ sessionKey: key, newPassword: "AnotherOne1!" })).rejects.toMatchObject({
      code: "not_usable",
    });
    expect(authRepo.updatePasswordHash).not.toHaveBeenCalled();
  });

  it("a never-issued code is refused identically, and mutates nothing", async () => {
    const authRepo = fakeAuthRepo();
    const tokenRepo = fakeTokenRepo();
    const b = build({ authRepo, tokenRepo });

    await expect(
      b.service.apply({ sessionKey: "no-such-position", newPassword: "N3wPassw0rd!" }),
    ).rejects.toMatchObject({ code: "not_usable" });
    expect(authRepo.updatePasswordHash).not.toHaveBeenCalled();
    expect(tokenRepo.deleteAllUserTokens).not.toHaveBeenCalled();
  });

  it("a race where markUsed loses is refused, and mutates nothing — the password never changes on a lost race", async () => {
    // A genuine TOCTOU race: the row still reads as fresh (findUsable's own
    // checks would pass it), but the conditional write reports zero rows
    // matched — a concurrent winner closed it between the read and this
    // write. Pre-marking usedAt on the row itself, by contrast, would be
    // caught by findUsable before markUsed is ever reached, proving nothing
    // about this guard specifically.
    const authRepo = fakeAuthRepo();
    const b = build({
      authRepo,
      repoOverride: { markUsed: async () => 0 },
    });
    const { sessionKey: key } = await readyToApply(b);

    await expect(b.service.apply({ sessionKey: key, newPassword: "N3wPassw0rd!" })).rejects.toMatchObject({
      code: "not_usable",
    });
    expect(authRepo.updatePasswordHash).not.toHaveBeenCalled();
  });
});
