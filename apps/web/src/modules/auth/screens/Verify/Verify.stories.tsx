import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { VerifyAsk } from "./VerifyAsk";
import { VerifyCode } from "./VerifyCode";
import { AuthLayout } from "../../layout";
import { JourneyLayout } from "../../layout/JourneyLayout";
import { stepStates } from "../../journey";
import { createAppError } from "@shared/errors";
import type { VerificationRepository } from "@shared/channel-verification";
import { sessionReducer } from "@shared/session";
import { AUTH_COPY } from "@shared/copy";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const noop = () => {};

const meta = {
  title: "Auth/Verify",
  component: VerifyAsk,
  args: { onSent: noop, onLater: noop },
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof VerifyAsk>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The journey has one route, so a story mounts the screen the phase chooses. */
const showing = (screen: React.ReactElement) => {
  const store = configureStore({ reducer: { session: sessionReducer } });

  return (Story: () => React.ReactElement) => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/onboarding"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route
                path="onboarding"
                element={
                  <JourneyLayout states={stepStates("verify", "saved")}>{screen}</JourneyLayout>
                }
              />
            </Route>
            <Route path="/feed" element={<p>the feed</p>} />
            <Route path="*" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

const ASK = <VerifyAsk onSent={noop} onLater={noop} />;
const CODE = <VerifyCode onVerified={noop} onLater={noop} />;

/* A refusal the reader can reach only by asking, so the story exercises the
   translation rather than asserting a message it planted itself. */
const refusing = (type: "too_many_requests" | "rate_limit"): VerificationRepository => ({
  issue: async () => {
    throw createAppError(type, "raw");
  },
  confirm: async () => {},
});

/** Nothing is sent until it is asked for: an optional step that mailed everyone
 *  who reached it would be behaving like a mandatory one. */
export const TheAskComesFirst: Story = {
  decorators: [showing(ASK)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.verify.askTitle }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
    await expect(canvas.queryByLabelText(AUTH_COPY.verify.codeLabel)).not.toBeInTheDocument();
  },
};

/** The code screen is what the phase chooses, so a reload keeps the field for a
 *  code already in the reader's inbox — the server says `code`, not the path. */
export const TheCodeScreenIsWhatThePhaseChooses: Story = {
  decorators: [showing(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.verify.codeTitle }),
    ).toBeVisible();
    await expect(canvas.getByLabelText(AUTH_COPY.verify.codeLabel)).toBeVisible();
  },
};

/** There is no way back from here, only on or out. */
export const TheCodeScreenOffersNoWayBack: Story = {
  decorators: [showing(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByLabelText(AUTH_COPY.verify.codeLabel);
    await expect(
      canvas.queryByRole("link", { name: AUTH_COPY.verify.backToProfile }),
    ).not.toBeInTheDocument();
  },
};

export const SendingIsReportedInPlace: Story = {
  decorators: [
    showing(
      <VerifyAsk
        onSent={noop}
        onLater={noop}
        repo={{ issue: () => new Promise(() => {}), confirm: async () => {} }}
      />,
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: AUTH_COPY.verify.send }));

    await expect(
      await canvas.findByRole("button", { name: AUTH_COPY.verify.sending }),
    ).toBeVisible();
  },
};

/** The address cooldown and the client limiter are different refusals, and the
 *  screen says so in its own words rather than a form's. */
export const TheCooldownRefusalSaysWhatItIs: Story = {
  decorators: [
    showing(<VerifyAsk onSent={noop} onLater={noop} repo={refusing("too_many_requests")} />),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: AUTH_COPY.verify.send }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      AUTH_COPY.verify.cooldownRefused,
    );
  },
};

export const TheClientLimiterSaysSomethingElse: Story = {
  decorators: [
    showing(<VerifyAsk onSent={noop} onLater={noop} repo={refusing("rate_limit")} />),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: AUTH_COPY.verify.send }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(AUTH_COPY.verify.rateLimited);
    await expect(alert).not.toHaveTextContent(AUTH_COPY.verify.cooldownRefused);
  },
};

/** Typing the code raises it, drops separators, and reads the ambiguous letters
 *  as digits — the server normalises none of that and rejects opaquely. */
export const TheCodeFieldForgivesWhatIsTyped: Story = {
  decorators: [showing(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const field = await canvas.findByLabelText(AUTH_COPY.verify.codeLabel);
    await userEvent.type(field, "7qk3-mnp2 xvzo");

    await waitFor(() => expect(field).toHaveValue("7QK3MNP2XVZ0"));
  },
};

/** Both of the step's screens report the same step. */
export const BothScreensAreTheSameStep: Story = {
  decorators: [showing(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const verify = canvas.getByText(AUTH_COPY.journey.steps.verify).closest("li");
    await expect(verify).toHaveAttribute("aria-current", "step");
  },
};

/** The window the ask was told is spent here: without the hand-off the screen
 *  opens with resend enabled and no wait, which is the opposite of the truth. */
export const TheWaitSurvivesTheHandOver: Story = {
  decorators: [showing(<VerifyCode openingWindow={60} onVerified={noop} onLater={noop} />)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const resend = await canvas.findByRole("button", {
      name: AUTH_COPY.verify.resendIn(60),
    });
    await expect(resend).toBeDisabled();
  },
};

/** Arriving cold — a reload — the wait is unknown, so the control is open and
 *  the first press is what asks the server for it. */
export const ArrivingColdTheWaitIsUnknown: Story = {
  decorators: [showing(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("button", { name: AUTH_COPY.verify.resend }),
    ).toBeEnabled();
  },
};

export const Compact: Story = {
  decorators: [showing(ASK)],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);
    await expect(await canvas.findByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
  },
};
