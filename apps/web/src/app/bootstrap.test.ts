import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { ERROR_COPY } from "@shared/copy";
import { errorNormalizer } from "@shared/errors";
import { bootstrap } from "./bootstrap";

describe("the composition root", () => {
  it("hands the error pipeline the catalogue's words, so an unmapped failure reads in them", () => {
    bootstrap();

    expect(errorNormalizer(new AxiosError("offline", "ERR_NETWORK")).message).toBe(ERROR_COPY.network);
  });
});
