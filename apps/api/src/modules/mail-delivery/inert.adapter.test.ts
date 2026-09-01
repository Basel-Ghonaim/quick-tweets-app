import { describe, expect, it, vi } from "vitest";

import { createInertMailAdapter } from "./inert.adapter.js";

const MESSAGE = {
  to: "recipient@example.test",
  subject: "Subject line",
  body: "Body text",
};

describe("the inert mail backend", () => {
  it("accepts a message and reports success", async () => {
    const adapter = createInertMailAdapter({ log: () => {} });
    await expect(adapter.send(MESSAGE)).resolves.toEqual({ outcome: "accepted" });
  });

  it("announces exactly one line per send", async () => {
    const lines: string[] = [];
    const adapter = createInertMailAdapter({ log: (m) => lines.push(m) });

    await adapter.send(MESSAGE);
    await adapter.send(MESSAGE);

    expect(lines).toHaveLength(2);
  });

  it("names the recipient and subject but never the body", async () => {
    const lines: string[] = [];
    const adapter = createInertMailAdapter({ log: (m) => lines.push(m) });

    await adapter.send(MESSAGE);

    expect(lines[0]).toContain(MESSAGE.to);
    expect(lines[0]).toContain(MESSAGE.subject);
    expect(lines[0]).not.toContain(MESSAGE.body);
  });

  it("falls back to the console when no log is injected", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(createInertMailAdapter().send(MESSAGE)).resolves.toEqual({
      outcome: "accepted",
    });
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
