import type { ReactElement } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { createAppError } from "@shared/errors";
import { AUTH_COPY } from "@shared/copy";
import { normaliseCode } from "@shared/one-time-code";
import { sessionReducer } from "@shared/session";
import type { VerificationGateway } from "@shared/channel-verification";
import { JourneyLayout } from "../../layout";
import { stepStates } from "../../services";
import { VerifyAsk } from "./VerifyAsk";
import { VerifyCode } from "./VerifyCode";

const noop = () => {};

/* `RouteLink` reads the search params, so a router is what these screens need
   to mount — the layout and the theme are the browser lane's business. */
const mount = (element: ReactElement) =>
  render(
    <Provider store={configureStore({ reducer: { session: sessionReducer } })}>
      <MemoryRouter initialEntries={["/auth/onboarding"]}>{element}</MemoryRouter>
    </Provider>,
  );

/* The code screen asks where the holder stands when it mounts, so every mount
   of it answers that read rather than letting one reach the network. */
const standing = (seconds: number): VerificationGateway => ({
  current: async () => ({
    status: "pending",
    resendAvailableAt: seconds > 0 ? Date.now() + seconds * 1000 : null,
  }),
  issue: async () => ({ resendAvailableAt: Date.now() + 60_000 }),
  confirm: async () => {},
});

const refusing = (type: "too_many_requests" | "rate_limit"): VerificationGateway => ({
  current: async () => ({ status: "pending", resendAvailableAt: null }),
  issue: async () => {
    throw createAppError(type, "raw");
  },
  confirm: async () => {},
});

describe("sending is reported in place", () => {
  it("names the wait on the control that started it", async () => {
    mount(
      <VerifyAsk
        onSent={noop}
        onLater={noop}
        repo={{
          current: async () => ({ status: "pending", resendAvailableAt: null }),
          issue: () => new Promise(() => {}),
          confirm: async () => {},
        }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: AUTH_COPY.verify.send }));

    expect(await screen.findByRole("button", { name: AUTH_COPY.verify.sending })).toBeTruthy();
  });
});

describe("the cooldown refusal says what it is", () => {
  it("reaches the reader in this screen's words, not a form's", async () => {
    mount(<VerifyAsk onSent={noop} onLater={noop} repo={refusing("too_many_requests")} />);

    fireEvent.click(await screen.findByRole("button", { name: AUTH_COPY.verify.send }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      AUTH_COPY.verify.cooldownRefused,
    );
  });
});

describe("the client limiter says something else", () => {
  it("is told apart from the address cooldown where the reader meets it", async () => {
    mount(<VerifyAsk onSent={noop} onLater={noop} repo={refusing("rate_limit")} />);

    fireEvent.click(await screen.findByRole("button", { name: AUTH_COPY.verify.send }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(AUTH_COPY.verify.rateLimited);
    expect(alert.textContent).not.toContain(AUTH_COPY.verify.cooldownRefused);
  });
});

describe("the code field forgives what is typed", () => {
  it("puts what is typed through the normaliser rather than showing it raw", async () => {
    mount(<VerifyCode repo={standing(0)} onVerified={noop} onLater={noop} />);

    const typed = "7qk3-mnp2 xvzo";
    const field = await screen.findByLabelText(AUTH_COPY.verify.codeLabel);
    fireEvent.change(field, { target: { value: typed } });

    // What the normaliser turns a code into is `normaliseCode.test.ts`'s; this
    // asserts only that the field is wired to it.
    await waitFor(() => expect((field as HTMLInputElement).value).toBe(normaliseCode(typed)));
    expect((field as HTMLInputElement).value).not.toBe(typed);
  });
});

describe("the wait comes from the server", () => {
  it("renders the resend held while the server's window is open", async () => {
    const seconds = 60;
    mount(<VerifyCode repo={standing(seconds)} onVerified={noop} onLater={noop} />);

    // How long the window lasts is the cooldown reducer's; this asserts only
    // that an open one reaches the control as a refusal to act.
    const resend = await screen.findByRole("button", {
      name: AUTH_COPY.verify.resendIn(seconds),
    });

    expect((resend as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("arriving with no window offers resend at once", () => {
  it("offers the control without a refusal to discover there is nothing to wait for", async () => {
    mount(<VerifyCode repo={standing(0)} onVerified={noop} onLater={noop} />);

    const resend = await screen.findByRole("button", { name: AUTH_COPY.verify.resend });

    expect((resend as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("a failed read still lets the code be typed", () => {
  it("leaves the field usable and the resend offered when the read fails", async () => {
    mount(
      <VerifyCode
        repo={{
          current: async () => {
            throw createAppError("network", "offline");
          },
          issue: async () => ({ resendAvailableAt: null }),
          confirm: async () => {},
        }}
        onVerified={noop}
        onLater={noop}
      />,
    );

    const typed = "7qk3";
    const field = await screen.findByLabelText(AUTH_COPY.verify.codeLabel);
    fireEvent.change(field, { target: { value: typed } });

    await waitFor(() => expect((field as HTMLInputElement).value).toBe(normaliseCode(typed)));
    const resend = screen.getByRole("button", { name: AUTH_COPY.verify.resend });
    expect((resend as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("the ask comes first", () => {
  it("offers the send, and no field for a code nothing has sent", async () => {
    mount(<VerifyAsk onSent={noop} onLater={noop} repo={standing(0)} />);

    await screen.findByRole("heading", { name: AUTH_COPY.verify.askTitle });
    expect(screen.getByRole("button", { name: AUTH_COPY.verify.send })).not.toBeNull();
    expect(screen.queryByLabelText(AUTH_COPY.verify.codeLabel)).toBeNull();
  });
});

describe("the code screen is what the phase chooses", () => {
  it("renders the field for a code already sent, rather than the ask", async () => {
    mount(<VerifyCode repo={standing(0)} onVerified={noop} onLater={noop} />);

    await screen.findByRole("heading", { name: AUTH_COPY.verify.codeTitle });
    expect(screen.getByLabelText(AUTH_COPY.verify.codeLabel)).not.toBeNull();
  });
});

describe("the code screen offers no way back", () => {
  it("holds no link to the step before it", async () => {
    mount(<VerifyCode repo={standing(0)} onVerified={noop} onLater={noop} />);

    await screen.findByLabelText(AUTH_COPY.verify.codeLabel);
    expect(screen.queryByRole("link", { name: AUTH_COPY.verify.backToProfile })).toBeNull();
  });
});

describe("both screens are the same step", () => {
  it("marks verify current for the second of them, as for the first", async () => {
    mount(
      <JourneyLayout states={stepStates("verify", null)}>
        <VerifyCode repo={standing(0)} onVerified={noop} onLater={noop} />
      </JourneyLayout>,
    );

    await screen.findByLabelText(AUTH_COPY.verify.codeLabel);
    const verify = screen.getByText(AUTH_COPY.journey.steps.verify).closest("li");
    expect(verify?.getAttribute("aria-current")).toBe("step");
  });
});
