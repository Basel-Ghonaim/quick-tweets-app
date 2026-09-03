import { describe, expect, it } from "vitest";
import { verifyDestination } from "./verifyDestination";

describe("where a reader arriving at the ask belongs", () => {
  it("stays on the ask when nothing has been proven or sent", () => {
    expect(verifyDestination("unproven")).toBe("ask");
  });

  it("goes to the code when one is already outstanding, so the ask cannot be reached again", () => {
    expect(verifyDestination("pending")).toBe("code");
  });

  it("leaves the step entirely once the address is proven", () => {
    expect(verifyDestination("proven")).toBe("done");
  });

  it("stays on the ask when the question could not be asked, rather than stranding the reader", () => {
    expect(verifyDestination(null)).toBe("ask");
  });
});
