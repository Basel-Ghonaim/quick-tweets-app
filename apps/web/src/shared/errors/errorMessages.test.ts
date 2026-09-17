import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErrorMessages, ErrorType } from "./types";

/* The wording is module state, so each case starts from a fresh import. */
beforeEach(() => {
  vi.resetModules();
});

const wordsFor = async (): Promise<ErrorMessages> => {
  const { errorConfigMap } = await import("./errorConfig");
  const types = Object.keys(errorConfigMap) as ErrorType[];
  return Object.fromEntries(types.map((type) => [type, `words for ${type}`])) as ErrorMessages;
};

describe("the error pipeline's default wording", () => {
  it("reports a failure in the wording the application supplied", async () => {
    const { setupErrorMessages } = await import("./errorMessages");
    const { buildAppError } = await import("./parsers/parserUtils");

    setupErrorMessages(await wordsFor());

    expect(buildAppError(503).message).toBe("words for service_unavailable");
    expect(buildAppError(400, "conflict").message).toBe("words for conflict");
  });

  it("holds no words of its own: an unsupplied type is reported by its name", async () => {
    const { buildAppError } = await import("./parsers/parserUtils");

    expect(buildAppError(503).message).toBe("service_unavailable");
  });
});
