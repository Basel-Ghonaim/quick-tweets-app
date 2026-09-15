import type { ReactElement } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { AUTH_COPY } from "@shared/copy";
import { normaliseCode } from "@shared/one-time-code";
import { sessionReducer } from "@shared/session";
import { server } from "@testing/server";
import {
  verificationIs,
  verificationNeverIssues,
  verificationReadRefuses,
  verificationRefusesIssue,
} from "@testing/handlers/verification";
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

const ASK = <VerifyAsk onSent={noop} onLater={noop} />;
const CODE = <VerifyCode onVerified={noop} onLater={noop} />;

/* The code screen asks where the holder stands when it mounts, so every mount
   of it answers that read rather than letting one reach the network. */
const standing = (seconds: number) => verificationIs("pending", seconds);

describe("sending is reported in place", () => {
  it("names the wait on the control that started it", async () => {
    server.use(verificationNeverIssues());
    mount(ASK);

    fireEvent.click(await screen.findByRole("button", { name: AUTH_COPY.verify.send }));

    expect(await screen.findByRole("button", { name: AUTH_COPY.verify.sending })).toBeTruthy();
  });
});

describe("the cooldown refusal says what it is", () => {
  it("reaches the reader in this screen's words, not a form's", async () => {
    server.use(verificationRefusesIssue("too_many_requests"));
    mount(ASK);

    fireEvent.click(await screen.findByRole("button", { name: AUTH_COPY.verify.send }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      AUTH_COPY.verify.cooldownRefused,
    );
  });
});

describe("the client limiter says something else", () => {
  it("is told apart from the address cooldown where the reader meets it", async () => {
    server.use(verificationRefusesIssue("rate_limit"));
    mount(ASK);

    fireEvent.click(await screen.findByRole("button", { name: AUTH_COPY.verify.send }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(AUTH_COPY.verify.rateLimited);
    expect(alert.textContent).not.toContain(AUTH_COPY.verify.cooldownRefused);
  });
});

describe("the code field forgives what is typed", () => {
  it("puts what is typed through the normaliser rather than showing it raw", async () => {
    server.use(standing(0));
    mount(CODE);

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
    server.use(standing(seconds));
    mount(CODE);

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
    server.use(standing(0));
    mount(CODE);

    const resend = await screen.findByRole("button", { name: AUTH_COPY.verify.resend });

    expect((resend as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("a failed read still lets the code be typed", () => {
  it("leaves the field usable and the resend offered when the read fails", async () => {
    server.use(verificationReadRefuses());
    mount(CODE);

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
    mount(ASK);

    await screen.findByRole("heading", { name: AUTH_COPY.verify.askTitle });
    expect(screen.getByRole("button", { name: AUTH_COPY.verify.send })).not.toBeNull();
    expect(screen.queryByLabelText(AUTH_COPY.verify.codeLabel)).toBeNull();
  });
});

describe("the code screen is what the phase chooses", () => {
  it("renders the field for a code already sent, rather than the ask", async () => {
    server.use(standing(0));
    mount(CODE);

    await screen.findByRole("heading", { name: AUTH_COPY.verify.codeTitle });
    expect(screen.getByLabelText(AUTH_COPY.verify.codeLabel)).not.toBeNull();
  });
});

describe("the code screen offers no way back", () => {
  it("holds no link to the step before it", async () => {
    server.use(standing(0));
    mount(CODE);

    await screen.findByLabelText(AUTH_COPY.verify.codeLabel);
    expect(screen.queryByRole("link", { name: AUTH_COPY.verify.backToProfile })).toBeNull();
  });
});

describe("both screens are the same step", () => {
  it("marks verify current for the second of them, as for the first", async () => {
    server.use(standing(0));
    mount(<JourneyLayout states={stepStates("verify", null)}>{CODE}</JourneyLayout>);

    await screen.findByLabelText(AUTH_COPY.verify.codeLabel);
    const verify = screen.getByText(AUTH_COPY.journey.steps.verify).closest("li");
    expect(verify?.getAttribute("aria-current")).toBe("step");
  });
});
