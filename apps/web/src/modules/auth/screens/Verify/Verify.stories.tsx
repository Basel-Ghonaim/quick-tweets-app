import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { VerifyAsk } from "./VerifyAsk";
import { VerifyCode } from "./VerifyCode";
import { AuthLayout } from "../../layout";
import { JourneyLayout } from "../../layout/JourneyLayout";
import { stepStates } from "../../components/Stepper";
import type { VerificationGateway } from "@shared/channel-verification";
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

/* The code screen asks where the holder stands when it mounts, so every story
   of it answers that read rather than letting one reach the network. */
const standing = (seconds: number): VerificationGateway => ({
  current: async () => ({
    status: "pending",
    resendAvailableAt: seconds > 0 ? Date.now() + seconds * 1000 : null,
  }),
  issue: async () => ({ resendAvailableAt: Date.now() + 60_000 }),
  confirm: async () => {},
});

const CODE = <VerifyCode repo={standing(0)} onVerified={noop} onLater={noop} />;

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

/** Both of the step's screens report the same step. */
export const BothScreensAreTheSameStep: Story = {
  decorators: [showing(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const verify = canvas.getByText(AUTH_COPY.journey.steps.verify).closest("li");
    await expect(verify).toHaveAttribute("aria-current", "step");
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
