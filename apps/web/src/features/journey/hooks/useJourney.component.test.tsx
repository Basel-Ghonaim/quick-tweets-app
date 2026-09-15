import type { ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { sessionActions, sessionReducer } from "@shared/session";
import { server } from "@testing/server";
import {
  countingReads,
  journeyIs,
  moveNeverAnswers,
  moveRefuses,
  recordingMoves,
} from "@testing/handlers/journey";
import { useJourney } from "./useJourney";

/** A store per mount, so one test's session cannot settle another's. */
const aStore = () => configureStore({ reducer: { session: sessionReducer } });

const inStore = (store: ReturnType<typeof aStore>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };

describe("the journey is asked for once", () => {
  it("asks on mount and not again when the caller re-renders", async () => {
    const store = aStore();
    store.dispatch(sessionActions.sessionSettled());
    const reads = countingReads();
    server.use(reads.handler);

    const { result, rerender } = renderHook(() => useJourney(), {
      wrapper: inStore(store),
    });

    await waitFor(() => expect(result.current.read.status).toBe("resolved"));
    expect(reads.count).toBe(1);

    rerender();
    rerender();

    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(reads.count).toBe(1);
  });

  it("asks again only when the reader retries", async () => {
    const store = aStore();
    store.dispatch(sessionActions.sessionSettled());
    const reads = countingReads();
    server.use(reads.handler);

    const { result } = renderHook(() => useJourney(), { wrapper: inStore(store) });
    await waitFor(() => expect(reads.count).toBe(1));

    result.current.retry();

    await waitFor(() => expect(reads.count).toBe(2));
  });
});

describe("the journey waits for the session", () => {
  it("asks nothing while the session is unsettled, and asks once it settles", async () => {
    const store = aStore();
    const reads = countingReads();
    server.use(reads.handler);

    const { result } = renderHook(() => useJourney(), { wrapper: inStore(store) });

    // Not "nothing happened within a while" — nothing has been asked, and the
    // read is still unresolved, which is observable now rather than after a wait.
    expect(reads.count).toBe(0);
    expect(result.current.read.status).toBe("unresolved");

    store.dispatch(sessionActions.sessionSettled());

    await waitFor(() => expect(reads.count).toBe(1));
    await waitFor(() => expect(result.current.read.status).toBe("resolved"));
  });

  it("asks once, not once per settling, when the session settles again", async () => {
    const store = aStore();
    store.dispatch(sessionActions.sessionSettled());
    const reads = countingReads();
    server.use(reads.handler);

    const { result } = renderHook(() => useJourney(), { wrapper: inStore(store) });
    await waitFor(() => expect(reads.count).toBe(1));

    store.dispatch(sessionActions.sessionSettled());

    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(reads.count).toBe(1);
  });
});

describe("leaving never waits on the close", () => {
  it("returns before the close answers, and survives its refusal", async () => {
    const store = aStore();
    store.dispatch(sessionActions.sessionSettled());
    server.use(journeyIs("profile"), moveNeverAnswers());

    const { result } = renderHook(() => useJourney(), { wrapper: inStore(store) });
    await waitFor(() => expect(result.current.read.status).toBe("resolved"));

    // `leave` returns nothing to await: if it waited on the close, this would
    // be the only place the test could hang.
    expect(result.current.leave()).toBeUndefined();
  });

  it("swallows a refused close rather than raising it at the reader", async () => {
    const store = aStore();
    store.dispatch(sessionActions.sessionSettled());
    server.use(journeyIs("profile"), moveRefuses());

    const { result } = renderHook(() => useJourney(), { wrapper: inStore(store) });
    await waitFor(() => expect(result.current.read.status).toBe("resolved"));

    expect(() => result.current.leave()).not.toThrow();
  });
});

describe("skipping says it was skipped", () => {
  it("carries the outcome to the server rather than deciding the next phase", async () => {
    const store = aStore();
    store.dispatch(sessionActions.sessionSettled());
    const advance = recordingMoves("verify", "skipped");
    server.use(journeyIs("profile"), advance.handler);

    const { result } = renderHook(() => useJourney(), { wrapper: inStore(store) });
    await waitFor(() => expect(result.current.read.status).toBe("resolved"));

    await result.current.advance({ to: "verify", outcome: "skipped" });

    expect(advance.moves).toEqual([{ to: "verify", outcome: "skipped" }]);
    await waitFor(() =>
      expect(result.current.state).toEqual({ phase: "verify", profileOutcome: "skipped" }),
    );
  });
});
