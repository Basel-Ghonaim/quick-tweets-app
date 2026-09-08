import { describe, expect, it, vi } from "vitest";
import { afterSuccess } from "./afterSuccess";

describe("afterSuccess", () => {
  it("runs the action, then the continuation", async () => {
    const order: string[] = [];
    const action = vi.fn(async () => void order.push("action"));

    await afterSuccess(action, () => order.push("done"))({});

    expect(order).toEqual(["action", "done"]);
  });

  it("does not continue when the action failed, so a rejected submit stays put", async () => {
    const onDone = vi.fn();

    await expect(
      afterSuccess(async () => {
        throw new Error("rejected");
      }, onDone)({}),
    ).rejects.toThrow("rejected");

    expect(onDone).not.toHaveBeenCalled();
  });

  it("is a no-op continuation when none is given", async () => {
    const action = vi.fn(async () => {});

    await afterSuccess(action)({});

    expect(action).toHaveBeenCalledTimes(1);
  });
});
