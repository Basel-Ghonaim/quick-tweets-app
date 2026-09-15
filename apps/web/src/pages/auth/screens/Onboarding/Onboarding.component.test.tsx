import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { AUTH_COPY } from "@shared/copy";
import { sessionActions, sessionReducer } from "@shared/session";
import { server } from "@testing/server";
import { journeyAdvancesTo, journeyIs, journeyRefuses } from "@testing/handlers/journey";
import { Onboarding } from "./Onboarding";

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

describe("the phase chooses the screen", () => {
  it("renders the screen the position reports, not the one the client assumes", async () => {
    server.use(journeyIs("profile"));
    mount();

    expect(await screen.findByRole("heading", { name: AUTH_COPY.profile.title })).not.toBeNull();
  });
});

describe("a skipped profile reads as skipped", () => {
  it("shows the step as skipped rather than done, from the outcome the server holds", async () => {
    // Both answer: at `verify` the resolution asks the server to move to the
    // code step, and the state it renders is whatever that answers.
    server.use(journeyIs("verify", "skipped"), journeyAdvancesTo("verify", "skipped"));
    mount();

    // The verify screen arriving is what says the read resolved; reading the
    // stepper before it would read the position the journey starts from.
    await screen.findByRole("heading", { name: AUTH_COPY.verify.askTitle });

    const profile = screen.getByText(AUTH_COPY.journey.steps.profile).closest("li");
    expect(profile?.textContent).toContain(AUTH_COPY.journey.states.skipped);
  });
});
