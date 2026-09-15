import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { AUTH_COPY } from "@shared/copy";
import { sessionReducer } from "@shared/session";
import { server } from "@testing/server";
import {
  recoveryPositionIs,
  recoveryPositionRefuses,
  recoveryRequests,
} from "@testing/handlers/recovery";
import { Recovery } from "./Recovery";

/** The steps a reader can stand on, as the server reports them. */
const AT_REQUEST = { step: "request" as const };
const AT_CODE = {
  step: "code" as const,
  maskedEndpoint: "h•••••@example.test",
  canResend: true,
};
const AT_PASSWORD = { step: "password" as const };

/* The flow dispatches on a completed reset and its links read the search
   params, so a store and a router are what this screen needs to mount. */
const mount = () =>
  render(
    <Provider store={configureStore({ reducer: { session: sessionReducer } })}>
      <MemoryRouter initialEntries={["/auth/recovery"]}>
        <Recovery />
      </MemoryRouter>
    </Provider>,
  );

describe("the step chooses the screen", () => {
  it("renders the step the position reports, not the one the client assumes", async () => {
    server.use(recoveryPositionIs(AT_REQUEST));
    mount();

    expect(
      await screen.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeTruthy();
  });
});

describe("a failed read offers a retry", () => {
  it("says the recovery is unavailable and offers a retry, never the first screen", async () => {
    server.use(recoveryPositionRefuses());
    mount();

    expect(await screen.findByText(AUTH_COPY.recovery.unavailable)).toBeTruthy();
    expect(screen.getByRole("button", { name: AUTH_COPY.recovery.retry })).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeNull();
  });
});

/* The address form is the way in for the cases that correct one, so its two
   steps are given a name rather than repeated. */
const typeAddress = async (scope: ReturnType<typeof within>, typed: string) => {
  fireEvent.change(await scope.findByLabelText(AUTH_COPY.recovery.emailLabel), {
    target: { value: typed },
  });
  fireEvent.click(scope.getByRole("button", { name: AUTH_COPY.recovery.send }));
};

/** The address step, where asking moves the reader on to the code. */
const askingMovesOn = () => {
  server.use(recoveryPositionIs(AT_REQUEST), recoveryRequests(AT_CODE));
};

describe("a reload keeps the place", () => {
  it("lands on the step the server reports, with the mask it gave", async () => {
    server.use(recoveryPositionIs(AT_CODE));
    mount();

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    // The address the reader sees is the server's mask, never what they typed.
    expect(screen.getByText(/h•••••@example\.test/)).not.toBeNull();
  });
});

describe("a reload at the password step can still finish", () => {
  it("offers the reset rather than only showing it", async () => {
    server.use(recoveryPositionIs(AT_PASSWORD));
    mount();

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle });
    const submit = screen.getByRole("button", { name: AUTH_COPY.recovery.submitPassword });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("neither address is echoed back", () => {
  it("renders alike for two different addresses, because the mask is the server's", async () => {
    const shown = async (typed: string) => {
      askingMovesOn();
      const { container, unmount } = mount();
      const scope = within(container);

      await typeAddress(scope, typed);
      await scope.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });

      const text = container.textContent;
      unmount();
      return text;
    };

    expect(await shown("holder@example.test")).toEqual(await shown("someone@example.test"));
  });
});

describe("the confirmation says nothing about the account", () => {
  it("announces politely, and without saying whether an account holds the address", async () => {
    askingMovesOn();
    const { container } = mount();

    await typeAddress(within(container), "someone@example.test");

    const confirmation = await screen.findByText(AUTH_COPY.recovery.sent);
    // Announced rather than merely drawn, and politely: it is not a failure.
    expect(confirmation.closest("[role='status']")).not.toBeNull();
  });
});

describe("the resend window is the server's own", () => {
  it("offers no resend while the window it reported is open", async () => {
    server.use(recoveryPositionIs({ ...AT_CODE, retryAfterSeconds: 42 }));
    mount();

    const resend = await screen.findByRole("button", {
      name: AUTH_COPY.recovery.resendIn(42),
    });
    expect((resend as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("a spent bound still has a way out", () => {
  it("says the bound is spent in text, and leaves the way out usable", async () => {
    server.use(recoveryPositionIs({ ...AT_CODE, canResend: false }));
    mount();

    expect(await screen.findByText(AUTH_COPY.recovery.resendSpent)).not.toBeNull();
    const out = screen.getByRole("button", { name: AUTH_COPY.recovery.startOver });
    expect((out as HTMLButtonElement).disabled).toBe(false);
    // No resend control at all, rather than one that cannot be used.
    expect(screen.queryByRole("button", { name: AUTH_COPY.recovery.resend })).toBeNull();
  });
});

describe("a mistyped address can be corrected", () => {
  it("returns to the address form without throwing the attempt away", async () => {
    server.use(recoveryPositionIs(AT_CODE));
    mount();

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.recovery.startOver }));

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle });
    expect(screen.getByLabelText(AUTH_COPY.recovery.emailLabel)).not.toBeNull();
  });
});

describe("the address comes back when correcting", () => {
  it("costs one character to fix rather than the whole address", async () => {
    askingMovesOn();
    const { container } = mount();
    const typed = "holder@example.test";

    await typeAddress(within(container), typed);
    await screen.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });

    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.recovery.startOver }));

    const field = await screen.findByLabelText(AUTH_COPY.recovery.emailLabel);
    expect((field as HTMLInputElement).value).toBe(typed);
  });
});

describe("a corrected address returns to the code", () => {
  it("abandons the attempt rather than moving a step, and the server says where", async () => {
    askingMovesOn();
    const { container } = mount();

    await typeAddress(within(container), "holder@example.test");
    await screen.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });

    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.recovery.startOver }));
    await screen.findByLabelText(AUTH_COPY.recovery.emailLabel);
    fireEvent.click(screen.getByRole("button", { name: AUTH_COPY.recovery.send }));

    expect(
      await screen.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle }),
    ).not.toBeNull();
  });
});

describe("every step can be left", () => {
  it("offers a link out, because sign in has an address of its own", async () => {
    server.use(recoveryPositionIs(AT_CODE));
    mount();

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    expect(
      screen.getByRole("link", { name: AUTH_COPY.recovery.backToLogin }).getAttribute("href"),
    ).toBe("/auth/signin");
  });
});

describe("the password step can be left but not restarted", () => {
  it("keeps the way out and offers no way back to the address", async () => {
    server.use(recoveryPositionIs(AT_PASSWORD));
    mount();

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle });
    expect(screen.getByRole("link", { name: AUTH_COPY.recovery.backToLogin })).not.toBeNull();
    expect(screen.queryByRole("button", { name: AUTH_COPY.recovery.startOver })).toBeNull();
  });
});

describe("the password step shows no address", () => {
  it("holds no mask, because the mask belongs to the step that asks for a code", async () => {
    server.use(recoveryPositionIs(AT_PASSWORD));
    mount();

    await screen.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle });
    expect(screen.queryByText(/•/)).toBeNull();
  });
});
