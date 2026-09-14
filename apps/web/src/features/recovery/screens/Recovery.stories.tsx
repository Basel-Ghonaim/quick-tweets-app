import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { createAppError } from "@shared/errors";
import { Recovery } from "./Recovery";
import { AuthLayout } from "@pages/auth/layout";
import { sessionReducer } from "@shared/session";
import { AUTH_COPY } from "@shared/copy";
import type { RecoveryPosition } from "../model";
import type { RecoveryGateway } from "../gateway";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const meta = {
  title: "Auth/Recovery",
  component: Recovery,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Recovery>;

export default meta;
type Story = StoryObj<typeof meta>;

const at = (over: Partial<RecoveryPosition> = {}): RecoveryPosition => ({
  step: "code",
  maskedAddress: "h•••••@example.test",
  resendAvailableIn: 0,
  canResend: true,
  ...over,
});

const repository = (over: Partial<RecoveryGateway> = {}): RecoveryGateway => ({
  position: async () => at(),
  request: async () => at(),
  resend: async () => at(),
  confirm: async () => {},
  apply: async () => {},
  ...over,
});

const withRepo = (repo: RecoveryGateway) => {
  const store = configureStore({ reducer: { session: sessionReducer } });

  return () => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/recovery"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="recovery" element={<Recovery repo={repo} />} />
              <Route path="signin" element={<p>sign in</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};
/* For the accessibility check and nothing else: the retry screen is rendered
   nowhere else, and what it means is the component lane's. */
export const TheReadFailed: Story = {
  render: withRepo(
    repository({
      position: async () => {
        throw createAppError("network", "offline");
      },
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("button", { name: AUTH_COPY.recovery.retry });
  },
};

/* The eight below exist for the accessibility check and nothing else. Each puts
   one state on screen so axe evaluates it, and asserts only that it is there —
   what the state means is the component lane's. */

const askFor = async (canvas: ReturnType<typeof within>) => {
  await userEvent.type(
    await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel),
    "holder@example.test",
  );
  await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.send }));
};

export const ThePositionIsBeingRead: Story = {
  render: withRepo(repository({ position: () => new Promise(() => {}) })),
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector("[class*='waiting']")).not.toBeNull(),
    );
  },
};

export const TheRequestRefused: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: async () => {
        throw createAppError("validation", "raw");
      },
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await askFor(canvas);
    await canvas.findByRole("alert");
  },
};

export const TheRequestLapsed: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: async () => at({ step: "request" }),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await askFor(canvas);
    await canvas.findByText(AUTH_COPY.recovery.lapsed);
  },
};

export const TheRequestSending: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: () => new Promise(() => {}),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await askFor(canvas);
    await canvas.findByRole("button", { name: AUTH_COPY.recovery.sending });
  },
};

export const TheCodeRefused: Story = {
  render: withRepo(
    repository({
      confirm: async () => {
        throw createAppError("validation", "raw");
      },
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText(AUTH_COPY.recovery.codeLabel), "7QK3MNP2XVZB");
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.submitCode }));
    await canvas.findByRole("alert");
  },
};

export const TheCodeSubmitting: Story = {
  render: withRepo(repository({ confirm: () => new Promise(() => {}) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText(AUTH_COPY.recovery.codeLabel), "7QK3MNP2XVZB");
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.submitCode }));
    await canvas.findByRole("button", { name: AUTH_COPY.recovery.submittingCode });
  },
};

const setPassword = async (canvas: ReturnType<typeof within>) => {
  await userEvent.type(
    await canvas.findByLabelText(AUTH_COPY.recovery.newPasswordLabel),
    "A-new-passw0rd!",
  );
  await userEvent.type(
    canvas.getByLabelText(AUTH_COPY.recovery.confirmPasswordLabel),
    "A-new-passw0rd!",
  );
  await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.submitPassword }));
};

export const ThePasswordRefused: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "password" }),
      apply: async () => {
        throw createAppError("validation", "raw");
      },
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await setPassword(canvas);
    await canvas.findByRole("alert");
  },
};

export const ThePasswordSubmitting: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "password" }),
      apply: () => new Promise(() => {}),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await setPassword(canvas);
    await canvas.findByRole("button", { name: AUTH_COPY.recovery.submittingPassword });
  },
};

/* The four below exist for the accessibility check and nothing else: each
   renders a state whose only other renderer moved to the component lane. */

export const TheResendWindowIsOpen: Story = {
  render: withRepo(
    repository({ position: async () => at({ step: "code", resendAvailableIn: 42 }) }),
  ),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("button", {
      name: AUTH_COPY.recovery.resendIn(42),
    });
  },
};

export const TheResendIsSpent: Story = {
  render: withRepo(repository({ position: async () => at({ step: "code", canResend: false }) })),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(AUTH_COPY.recovery.resendSpent);
  },
};

export const TheCodeStepConfirms: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: async () => at({ step: "code" }),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel),
      "holder@example.test",
    );
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.send }));
    await canvas.findByText(AUTH_COPY.recovery.sent);
  },
};

export const TheAddressStepAfterRestart: Story = {
  render: withRepo(repository({ position: async () => at({ step: "code" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.startOver }));
    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle });
  },
};
