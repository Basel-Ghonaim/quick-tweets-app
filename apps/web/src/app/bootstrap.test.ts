import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { CATALOGUES, currentCopy, ERROR_COPY } from "@shared/copy";
import { errorNormalizer } from "@shared/errors";
import { bootstrap } from "./bootstrap";

describe("the composition root", () => {
  it("registers the catalogues, so the active language's words can be read", () => {
    bootstrap();

    expect(currentCopy()).toBe(CATALOGUES.en);
  });

  it("hands the error pipeline the catalogue's words, so an unmapped failure reads in them", () => {
    bootstrap();

    expect(errorNormalizer(new AxiosError("offline", "ERR_NETWORK")).message).toBe(ERROR_COPY.network);
  });
});
