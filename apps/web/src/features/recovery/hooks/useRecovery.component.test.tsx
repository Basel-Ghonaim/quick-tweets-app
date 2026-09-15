import type { ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { sessionReducer } from "@shared/session";
import { server } from "@testing/server";
import {
  countingConfirms,
  countingPositions,
  recoveryConfirmRefuses,
} from "@testing/handlers/recovery";
import { useRecovery } from "./useRecovery";

/** The steps a reader can stand on, as the server reports them. */
const AT_CODE = {
  step: "code" as const,
  maskedEndpoint: "h•••••@example.test",
  canResend: true,
};
const AT_PASSWORD = { step: "password" as const };

// The hook dispatches on a completed reset, so a store is what it needs to
// mount — not what any assertion here reads.
const inAStore = ({ children }: { children: ReactNode }) => (
  <Provider store={configureStore({ reducer: { session: sessionReducer } })}>{children}</Provider>
);

describe("the recovery position is asked for once", () => {
  it("asks on mount and not again when the caller re-renders", async () => {
    const positions = countingPositions(() => AT_CODE);
    server.use(positions.handler);

    const { result, rerender } = renderHook(() => useRecovery(), { wrapper: inAStore });

    await waitFor(() => expect(result.current.read.status).toBe("resolved"));
    expect(positions.count).toBe(1);

    rerender();
    rerender();

    await waitFor(() => expect(result.current.position).not.toBeNull());
    expect(positions.count).toBe(1);
  });

  it("asks again only when the reader retries", async () => {
    const positions = countingPositions(() => AT_CODE);
    server.use(positions.handler);

    const { result } = renderHook(() => useRecovery(), { wrapper: inAStore });

    await waitFor(() => expect(positions.count).toBe(1));

    result.current.retry();

    await waitFor(() => expect(positions.count).toBe(2));
  });
});

describe("confirming re-reads rather than assuming", () => {
  it("takes the step from a fresh read, not from the confirmation succeeding", async () => {
    let confirmed = false;
    const positions = countingPositions(() => (confirmed ? AT_PASSWORD : AT_CODE));
    const confirms = countingConfirms(() => {
      confirmed = true;
    });
    server.use(positions.handler, confirms.handler);

    const { result } = renderHook(() => useRecovery(), { wrapper: inAStore });
    await waitFor(() => expect(result.current.position?.step).toBe("code"));

    await result.current.confirm("7QK3MNP2XVZB");

    await waitFor(() => expect(result.current.position?.step).toBe("password"));
    expect(confirms.count).toBe(1);
    expect(positions.count).toBe(2);
  });

  it("does not move the reader when the confirmation is refused", async () => {
    const positions = countingPositions(() => AT_CODE);
    server.use(positions.handler, recoveryConfirmRefuses());

    const { result } = renderHook(() => useRecovery(), { wrapper: inAStore });
    await waitFor(() => expect(result.current.position?.step).toBe("code"));

    await expect(result.current.confirm("7QK3MNP2XVZB")).rejects.toThrow();

    expect(positions.count).toBe(1);
    expect(result.current.position?.step).toBe("code");
  });
});
