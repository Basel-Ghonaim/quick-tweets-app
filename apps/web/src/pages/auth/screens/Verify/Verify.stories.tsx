import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { createAppError } from "@shared/errors";
import { VerifyAsk } from "./VerifyAsk";
import { VerifyCode } from "./VerifyCode";
import { AuthLayout } from "@pages/auth/layout";
import { JourneyLayout } from "@pages/auth/layout/JourneyLayout";
import { stepStates } from "../../services";
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

export const Compact: Story = {
  decorators: [showing(ASK)],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);
    await expect(await canvas.findByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
  },
};

/* The five below exist for the accessibility check and nothing else. Each puts
   one state on screen so axe evaluates it, and asserts only that the state is
   there — what the state means is the component lane's. */

const refusing = (type: "too_many_requests" | "rate_limit"): VerificationGateway => ({
  current: async () => ({ status: "pending", resendAvailableAt: null }),
  issue: async () => {
    throw createAppError(type, "raw");
  },
  confirm: async () => {},
});

export const TheAskRefused: Story = {
  decorators: [
    showing(<VerifyAsk onSent={noop} onLater={noop} repo={refusing("too_many_requests")} />),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: AUTH_COPY.verify.send }));
    await canvas.findByRole("alert");
  },
};

export const TheAskSending: Story = {
  decorators: [
    showing(
      <VerifyAsk
        onSent={noop}
        onLater={noop}
        repo={{
          current: async () => ({ status: "pending", resendAvailableAt: null }),
          issue: () => new Promise(() => {}),
          confirm: async () => {},
        }}
      />,
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: AUTH_COPY.verify.send }));
    await canvas.findByRole("button", { name: AUTH_COPY.verify.sending });
  },
};

export const TheCodeRefused: Story = {
  decorators: [
    showing(
      <VerifyCode
        repo={{
          current: async () => ({ status: "pending", resendAvailableAt: null }),
          issue: async () => ({ resendAvailableAt: null }),
          confirm: async () => {
            throw createAppError("bad_request", "raw");
          },
        }}
        onVerified={noop}
        onLater={noop}
      />,
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText(AUTH_COPY.verify.codeLabel), "7QK3MNP2XVZB");
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.verify.submit }));
    await canvas.findByRole("alert");
  },
};

export const TheResendHeld: Story = {
  decorators: [showing(<VerifyCode repo={standing(60)} onVerified={noop} onLater={noop} />)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("button", { name: AUTH_COPY.verify.resendIn(60) });
  },
};

export const TheCodeSubmitting: Story = {
  decorators: [
    showing(
      <VerifyCode
        repo={{
          current: async () => ({ status: "pending", resendAvailableAt: null }),
          issue: async () => ({ resendAvailableAt: null }),
          confirm: () => new Promise(() => {}),
        }}
        onVerified={noop}
        onLater={noop}
      />,
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText(AUTH_COPY.verify.codeLabel), "7QK3MNP2XVZB");
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.verify.submit }));
    await canvas.findByRole("button", { name: AUTH_COPY.verify.submitting });
  },
};
