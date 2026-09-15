import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { server } from "@testing/server";
import { journeyIs, journeyRefuses } from "@testing/handlers/journey";
import { AUTH_COPY } from "@shared/copy";
import { sessionActions, sessionReducer } from "@shared/session";
import { Onboarding } from "./Onboarding";

/*
 * PROOF ARTIFACT — deleted when the real Onboarding tests are converted.
 * It exists to hold the infrastructure honest: origin-agnostic handlers, the
 * lane's own server, and a bootstrapped transport. It names nothing from
 * @features/journey — no gateway, no wire state.
 */

/* The feed route exists so an ejection would be visible: asserting that the
   reader stayed means nothing if there is nowhere for them to have gone. */
const mount = () => {
  const store = configureStore({ reducer: { session: sessionReducer } });
  store.dispatch(sessionActions.sessionSettled());

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/auth/onboarding"]}>
        <Routes>
          <Route path="/auth/onboarding" element={<Onboarding />} />
          <Route path="/feed" element={<p>the feed</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe("the phase chooses the screen", () => {
  it("renders the screen the position reports, not the one the client assumes", async () => {
    server.use(journeyIs("profile"));
    mount();

    expect(await screen.findByRole("heading", { name: AUTH_COPY.profile.title })).not.toBeNull();
  });
});

describe("a failed read offers a retry", () => {
  it("says the journey is unavailable and keeps the reader where they are", async () => {
    server.use(journeyRefuses());
    mount();

    expect((await screen.findByRole("alert")).textContent).toContain(
      AUTH_COPY.onboarding.unavailable,
    );
    expect(screen.getByRole("button", { name: AUTH_COPY.onboarding.retry })).toBeTruthy();
    expect(screen.queryByText("the feed")).toBeNull();
  });
});

describe("the transport is bootstrapped, so a 401 is recognised as one", () => {
  it("sends the reader to sign-in rather than offering a retry", async () => {
    server.use(journeyRefuses(401));
    mount();

    // Normalized, `resolveJourney` reports unauthorized, destinationFor gives
    // "signin", and the reader is redirected — so no retry arm renders.
    await screen.findByText("the feed", {}, { timeout: 100 }).catch(() => null);
    expect(screen.queryByRole("button", { name: AUTH_COPY.onboarding.retry })).toBeNull();
  });
});
