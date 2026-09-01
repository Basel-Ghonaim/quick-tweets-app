import { describe, expect, it, vi } from "vitest";

import { createMailAdapter } from "./index.js";
import { MailModeError, resolveMailMode } from "./mail.mode.js";

const DEV = "development";

describe("resolveMailMode — anything unrecognised resolves to inert", () => {
  const cases: (string | undefined)[] = [
    undefined,
    "",
    "inert",
    "Inert",
    "INERT",
    "inert ",
    " inert",
    "relay",
    "true",
    "1",
  ];

  for (const raw of cases) {
    it(`${JSON.stringify(raw)} -> inert`, () => {
      expect(resolveMailMode(raw, DEV, () => {})).toBe("inert");
    });
  }
});

describe("capture is reachable only by an exact opt-in", () => {
  it("resolves on an exact match outside production", () => {
    expect(resolveMailMode("capture", DEV, () => {})).toBe("capture");
    expect(resolveMailMode("capture", "test", () => {})).toBe("capture");
  });

  const nearMisses = ["Capture", "CAPTURE", "capture ", " capture", "captures", "cap"];

  for (const raw of nearMisses) {
    it(`${JSON.stringify(raw)} is not close enough — resolves to inert`, () => {
      expect(resolveMailMode(raw, DEV, () => {})).toBe("inert");
    });
  }

  it("is refused in production, which now stops the boot rather than warning", () => {
    // It writes single-use secrets to disk and cannot deliver, so it fails both
    // of production's tests. The refusal used to warn and fall back to inert;
    // falling back is exactly the silent outage the delivery rule removes.
    expect(() => resolveMailMode("capture", "production", () => {})).toThrow(MailModeError);
  });

  it("is never what anything falls back to", () => {
    const everythingElse = [undefined, "", "relay", "Capture", "1"];

    for (const raw of everythingElse) {
      expect(resolveMailMode(raw, DEV, () => {})).not.toBe("capture");
      // In production none of these resolve at all — they refuse.
      expect(() => resolveMailMode(raw, "production", () => {})).toThrow(MailModeError);
    }
  });
});

describe("an unrecognised value is warned about, never silent", () => {
  it("names the offending value in the warning", () => {
    const warnings: string[] = [];

    resolveMailMode("relay", DEV, (m) => warnings.push(m));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("relay");
  });

  it("stays quiet for an absent or recognised value", () => {
    const warnings: string[] = [];

    resolveMailMode(undefined, DEV, (m) => warnings.push(m));
    resolveMailMode("inert", DEV, (m) => warnings.push(m));
    resolveMailMode("capture", DEV, (m) => warnings.push(m));
    resolveMailMode("smtp", DEV, (m) => warnings.push(m));

    expect(warnings).toEqual([]);
  });

  it("warns through the console when no warn is injected", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(resolveMailMode("relay", DEV)).toBe("inert");
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe("createMailAdapter", () => {
  it("returns a usable adapter for the resolved mode", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      createMailAdapter("inert").send({
        to: "recipient@example.test",
        subject: "Subject line",
        body: "Body text",
      }),
    ).resolves.toEqual({ outcome: "accepted" });

    spy.mockRestore();
  });
});
