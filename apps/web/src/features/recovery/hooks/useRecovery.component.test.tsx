import type { ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { sessionReducer } from "@shared/session";
import { useRecovery } from "./useRecovery";
import type { RecoveryPosition } from "../model";
import type { RecoveryGateway } from "../gateway";

const at = (over: Partial<RecoveryPosition> = {}): RecoveryPosition => ({
  step: "code",
  maskedAddress: "h•••••@example.test",
  resendAvailableIn: 0,
  canResend: true,
  ...over,
});

const gatewayOf = (over: Partial<RecoveryGateway> = {}): RecoveryGateway => ({
  position: vi.fn(async () => at()),
  request: vi.fn(async () => at()),
  resend: vi.fn(async () => at()),
  confirm: vi.fn(async () => {}),
  apply: vi.fn(async () => {}),
  ...over,
});

// The hook dispatches on a completed reset, so a store is what it needs to
// mount — not what any assertion here reads.
const inAStore = ({ children }: { children: ReactNode }) => (
  <Provider store={configureStore({ reducer: { session: sessionReducer } })}>{children}</Provider>
);

describe("the recovery position is asked for once", () => {
  it("asks on mount and not again when the caller re-renders", async () => {
    const gateway = gatewayOf();
    const { result, rerender } = renderHook(() => useRecovery(gateway), { wrapper: inAStore });

    await waitFor(() => expect(result.current.read.status).toBe("resolved"));
    expect(gateway.position).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    await waitFor(() => expect(result.current.position).not.toBeNull());
    expect(gateway.position).toHaveBeenCalledTimes(1);
  });

  it("asks again only when the reader retries", async () => {
    const gateway = gatewayOf();
    const { result } = renderHook(() => useRecovery(gateway), { wrapper: inAStore });

    await waitFor(() => expect(gateway.position).toHaveBeenCalledTimes(1));

    result.current.retry();

    await waitFor(() => expect(gateway.position).toHaveBeenCalledTimes(2));
  });
});

describe("confirming re-reads rather than assuming", () => {
  it("takes the step from a fresh read, not from the confirmation succeeding", async () => {
    let confirmed = false;
    const gateway = gatewayOf({
      position: vi.fn(async () => at({ step: confirmed ? "password" : "code" })),
      confirm: vi.fn(async () => {
        confirmed = true;
      }),
    });

    const { result } = renderHook(() => useRecovery(gateway), { wrapper: inAStore });
    await waitFor(() => expect(result.current.position?.step).toBe("code"));

    await result.current.confirm("7QK3MNP2XVZB");

    await waitFor(() => expect(result.current.position?.step).toBe("password"));
    expect(gateway.confirm).toHaveBeenCalledTimes(1);
    expect(gateway.position).toHaveBeenCalledTimes(2);
  });

  it("does not move the reader when the confirmation is refused", async () => {
    const gateway = gatewayOf({
      confirm: vi.fn(async () => {
        throw new Error("refused");
      }),
    });

    const { result } = renderHook(() => useRecovery(gateway), { wrapper: inAStore });
    await waitFor(() => expect(result.current.position?.step).toBe("code"));

    await expect(result.current.confirm("7QK3MNP2XVZB")).rejects.toThrow();

    expect(gateway.position).toHaveBeenCalledTimes(1);
    expect(result.current.position?.step).toBe("code");
  });
});
