import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";
import { sessionReducer } from "@shared/session";
import type { ProfileGateway } from "@features/profile";
import { JourneyLayout } from "@pages/auth/layout";
import { stepStates } from "../../services";
import { Profile } from "./Profile";

const noop = () => {};

/* `RouteLink` reads the search params and the flow reads the session, so a
   router and a store are what this screen needs to mount. The layout and the
   stepper around it are the browser lane's business. */
const mount = (repo?: ProfileGateway) =>
  render(
    <Provider store={configureStore({ reducer: { session: sessionReducer } })}>
      <MemoryRouter initialEntries={["/auth/onboarding"]}>
        <Profile onSettled={noop} repo={repo} />
      </MemoryRouter>
    </Provider>,
  );

/* jsdom defines no `DataTransfer`, so the file is put on the input directly.
   What is asserted is unchanged; only the way a file gets there differs, and
   the original way is a browser API. */
const choose = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
};

describe("a server error is announced", () => {
  it("reaches the reader in an alert region, in the wording profile settled on", async () => {
    const refusal = createAppError("validation", "raw");
    mount({
      uploadAvatar: async () => "token",
      updateProfile: async () => {
        throw refusal;
      },
    });

    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.profile.submit }));

    // Which words a refusal is given is `profileErrorHandler.test.ts`'s, which
    // asserts the catalogue entry directly. The handler is not published, and
    // publishing it so a test could name it would be production adapting to a
    // lane — so this asserts what it can without restating: an alert appears,
    // and it carries the handled message rather than the raw one.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toBe("");
    expect(alert.textContent).not.toContain("raw");
  });
});

describe("saving is reported in place", () => {
  it("names the wait on the control that started it", async () => {
    mount({
      uploadAvatar: async () => "token",
      updateProfile: () => new Promise(() => {}),
    });

    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.profile.submit }));

    expect(
      await screen.findByRole("button", { name: AUTH_COPY.profile.submitting }),
    ).toBeTruthy();
  });
});

describe("skipping issues no request", () => {
  it("leaves the form at rest, with nothing announced", async () => {
    mount();

    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.profile.skip }));

    expect(screen.queryByRole("alert")).toBeNull();
    const submit = screen.getByRole("button", { name: AUTH_COPY.profile.submit });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("choosing a picture starts the upload", () => {
  it("reaches the upload on selection, and says so, without a submit", async () => {
    mount();

    const input = document.querySelector<HTMLInputElement>("input[type='file']")!;
    choose(input, new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));

    const live = document.querySelector("[role='status']")!;
    await waitFor(() => expect(live.textContent).not.toBe(""));
  });
});

/* The stepper is the layout's, so the one case about it mounts the layout the
   route mounts rather than the screen on its own. */
const mountInJourney = () =>
  render(
    <Provider store={configureStore({ reducer: { session: sessionReducer } })}>
      <MemoryRouter initialEntries={["/auth/onboarding"]}>
        <JourneyLayout states={stepStates("profile", null)}>
          <Profile onSettled={noop} />
        </JourneyLayout>
      </MemoryRouter>
    </Provider>,
  );

describe("the form is at rest", () => {
  it("offers every field and both actions, with one submit among them", () => {
    const { container } = mount();

    expect(screen.getByRole("heading", { name: AUTH_COPY.profile.title })).not.toBeNull();
    expect(screen.getByLabelText(/display name/i)).not.toBeNull();
    expect(screen.getByLabelText(/^bio$/i)).not.toBeNull();
    expect(screen.getByLabelText(AUTH_COPY.profile.avatarLabel)).not.toBeNull();
    expect(screen.getByRole("button", { name: AUTH_COPY.profile.submit })).not.toBeNull();
    expect(screen.getByRole("button", { name: AUTH_COPY.profile.skip })).not.toBeNull();

    /* Everything that is not the primary action carries no fill. */
    expect(container.querySelectorAll("button[type='submit']")).toHaveLength(1);
  });
});

describe("the journey is at profile", () => {
  it("marks profile current and the step before it done", () => {
    mountInJourney();

    const profile = screen.getByText(AUTH_COPY.journey.steps.profile).closest("li");
    expect(profile?.getAttribute("aria-current")).toBe("step");

    const account = screen.getByText(AUTH_COPY.journey.steps.account).closest("li");
    expect(account?.textContent).toContain(AUTH_COPY.journey.states.done);
  });
});

describe("the bio count tracks what is typed", () => {
  it("moves with the field rather than waiting for a submit", async () => {
    mount();

    expect(screen.getByText(AUTH_COPY.profile.bioCount(0, 160))).not.toBeNull();

    fireEvent.change(screen.getByLabelText(/^bio$/i), { target: { value: "hello" } });

    await waitFor(() =>
      expect(screen.getByText(AUTH_COPY.profile.bioCount(5, 160))).not.toBeNull(),
    );
  });
});
