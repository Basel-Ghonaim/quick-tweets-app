import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOGUES, currentCopy, ERROR_COPY } from "@shared/copy";
import { errorNormalizer } from "@shared/errors";
import { setupLocalisation } from "@shared/localisation";
import { bootstrap } from "./bootstrap";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the composition root", () => {
  it("registers the catalogues, so the active language's words can be read", () => {
    bootstrap();

    expect(currentCopy()).toBe(CATALOGUES.en);
  });

  it("hands the error pipeline the catalogue's words, so an unmapped failure reads in them", () => {
    bootstrap();

    expect(errorNormalizer(new AxiosError("offline", "ERR_NETWORK")).message).toBe(ERROR_COPY.network);
  });

  it("hands them over to be read per failure, so a failure reads in the language active when it happens", () => {
    bootstrap();

    vi.stubGlobal("navigator", { languages: ["xx"], language: "xx" });
    setupLocalisation({
      ...CATALOGUES,
      xx: { ...CATALOGUES.en, errors: { ...CATALOGUES.en.errors, network: "Stand-in network wording" } },
    });

    expect(errorNormalizer(new AxiosError("offline", "ERR_NETWORK")).message).toBe("Stand-in network wording");
  });
});
