import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";
import { sessionReducer } from "@shared/session";
import type { ProfileGateway } from "@features/profile";
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
  it("reaches the reader in an alert region", async () => {
    mount({
      uploadAvatar: async () => "token",
      updateProfile: async () => {
        throw createAppError("validation", "raw");
      },
    });

    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.profile.submit }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(AUTH_COPY.profile.invalid);
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
