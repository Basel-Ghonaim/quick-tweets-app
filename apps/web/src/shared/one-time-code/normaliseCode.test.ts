import { describe, expect, it } from "vitest";
import { normaliseCode } from "./normaliseCode";

describe("normaliseCode", () => {
  it("raises case, so a code typed in lower case is not read as a wrong one", () => {
    expect(normaliseCode("7qk3mnp2xvzb")).toBe("7QK3MNP2XVZB");
  });

  it("drops the spacing and separators a reader copies with the code", () => {
    expect(normaliseCode("7QK3 MNP2-XVZB")).toBe("7QK3MNP2XVZB");
  });

  it("reads the dropped letters as the digits they are mistaken for", () => {
    expect(normaliseCode("IiLlOo")).toBe("111100");
  });

  it("refuses what the alphabet does not carry, U included — it resembles no digit", () => {
    expect(normaliseCode("U7@K")).toBe("7K");
  });
});
