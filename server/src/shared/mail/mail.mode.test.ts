import { describe, expect, it, vi } from "vitest";

import { createMailAdapter } from "./index.js";
import { resolveMailMode } from "./mail.mode.js";

describe("resolveMailMode — every value resolves to inert", () => {
  const cases: (string | undefined)[] = [
    undefined,
    "",
    "inert",
    "Inert",
    "INERT",
    "inert ",
    " inert",
    "smtp",
    "true",
    "1",
  ];

  for (const raw of cases) {
    it(`${JSON.stringify(raw)} -> inert`, () => {
      expect(resolveMailMode(raw, () => {})).toBe("inert");
    });
  }
});

describe("an unrecognised value is warned about, never silent", () => {
  it("names the offending value in the warning", () => {
    const warnings: string[] = [];

    resolveMailMode("smtp", (m) => warnings.push(m));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("smtp");
  });

  it("stays quiet for an absent or recognised value", () => {
    const warnings: string[] = [];

    resolveMailMode(undefined, (m) => warnings.push(m));
    resolveMailMode("inert", (m) => warnings.push(m));

    expect(warnings).toEqual([]);
  });

  it("warns through the console when no warn is injected", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(resolveMailMode("smtp")).toBe("inert");
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
    ).resolves.toEqual({ ok: true });

    spy.mockRestore();
  });
});
