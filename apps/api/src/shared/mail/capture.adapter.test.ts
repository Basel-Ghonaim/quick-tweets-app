import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createCaptureMailAdapter } from "./capture.adapter.js";

const MESSAGE = {
  to: "holder@example.test",
  subject: "Your verification code",
  body: "Your verification code is ABCDEFGHJKMN.",
};

const T0 = new Date("2026-01-01T12:00:00Z");

const created: string[] = [];

const scratch = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mail-capture-"));
  created.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const onlyFileIn = async (dir: string) => {
  const entries = await readdir(dir);
  expect(entries).toHaveLength(1);
  return readFile(path.join(dir, entries[0]!), "utf8");
};

describe("the capture mail backend", () => {
  it("reports success", async () => {
    const adapter = createCaptureMailAdapter({ dir: await scratch(), log: () => {} });

    await expect(adapter.send(MESSAGE)).resolves.toEqual({ ok: true });
  });

  it("writes the whole message — including the body a reader needs", async () => {
    const dir = await scratch();

    await createCaptureMailAdapter({ dir, now: () => T0, log: () => {} }).send(MESSAGE);

    const written = await onlyFileIn(dir);
    expect(written).toContain(MESSAGE.to);
    expect(written).toContain(MESSAGE.subject);
    expect(written).toContain(MESSAGE.body);
  });

  it("creates its destination when it is not there yet", async () => {
    const dir = path.join(await scratch(), "nested", "outbox");

    await createCaptureMailAdapter({ dir, log: () => {} }).send(MESSAGE);

    expect(await readdir(dir)).toHaveLength(1);
  });

  it("keeps one file per message, named so they sort by time", async () => {
    const dir = await scratch();
    const adapter = createCaptureMailAdapter({
      dir,
      now: (() => {
        let tick = 0;
        return () => new Date(T0.getTime() + tick++ * 1000);
      })(),
      log: () => {},
    });

    await adapter.send(MESSAGE);
    await adapter.send({ ...MESSAGE, body: "A later message." });

    const entries = (await readdir(dir)).sort();
    expect(entries).toHaveLength(2);

    const latest = await readFile(path.join(dir, entries[1]!), "utf8");
    expect(latest).toContain("A later message.");
  });

  it("announces where it put the message, so a reader can find it", async () => {
    const dir = await scratch();
    const lines: string[] = [];

    await createCaptureMailAdapter({ dir, log: (m) => lines.push(m) }).send(MESSAGE);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(MESSAGE.to);
  });

  it("reports a write failure rather than raising it", async () => {
    // A path that cannot be a directory, because a file already occupies it.
    const dir = await scratch();
    const blocked = path.join(dir, "blocker");
    await createCaptureMailAdapter({ dir, log: () => {} }).send(MESSAGE);
    const occupied = path.join(blocked, "child");

    const { writeFile } = await import("node:fs/promises");
    await writeFile(blocked, "not a directory", "utf8");

    const result = await createCaptureMailAdapter({ dir: occupied, log: () => {} }).send(MESSAGE);

    expect(result.ok).toBe(false);
  });
});
