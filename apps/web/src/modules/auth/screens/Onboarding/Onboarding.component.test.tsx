import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";
import { sessionActions, sessionReducer } from "@shared/session";
import type { JourneyGateway, JourneyState } from "@features/journey";
import { Onboarding } from "./Onboarding";

const state = (over: Partial<JourneyState> = {}): JourneyState => ({
  phase: "profile",
  profileOutcome: null,
  ...over,
});

const gatewayOf = (over: Partial<JourneyGateway> = {}): JourneyGateway => ({
  read: vi.fn(async () => state()),
  advance: vi.fn(async () => state()),
  ...over,
});

/* The feed route exists so an ejection would be visible: asserting that the
   reader stayed means nothing if there is nowhere for them to have gone. */
const mount = (repo: JourneyGateway) => {
  const store = configureStore({ reducer: { session: sessionReducer } });
  store.dispatch(sessionActions.sessionSettled());

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/auth/onboarding"]}>
        <Routes>
          <Route path="/auth/onboarding" element={<Onboarding repo={repo} />} />
          <Route path="/feed" element={<p>the feed</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe("a failed read offers a retry", () => {
  it("says the journey is unavailable and keeps the reader where they are", async () => {
    mount(
      gatewayOf({
        read: vi.fn(async () => {
          throw createAppError("network", "Offline");
        }),
      }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      AUTH_COPY.onboarding.unavailable,
    );
    expect(screen.getByRole("button", { name: AUTH_COPY.onboarding.retry })).toBeTruthy();
    expect(screen.queryByText("the feed")).toBeNull();
  });
});
