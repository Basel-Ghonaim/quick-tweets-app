import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import {
  recoveryApplyNeverAnswers,
  recoveryApplyRefuses,
  recoveryConfirmNeverAnswers,
  recoveryConfirmRefuses,
  recoveryPositionIs,
  recoveryPositionNeverAnswers,
  recoveryPositionRefuses,
  recoveryRequestNeverAnswers,
  recoveryRequestRefuses,
  recoveryRequests,
} from "@testing/handlers/recovery";
import { Recovery } from "./Recovery";
import { AuthLayout } from "@pages/auth/layout";
import { sessionReducer } from "@shared/session";
import { currentCopy } from "@shared/copy";

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

/** The step a reader who already has a code stands on. */
const AT_CODE = {
  step: "code" as const,
  maskedEndpoint: "h•••••@example.test",
  canResend: true,
};

const AT_REQUEST = { step: "request" as const };
const AT_PASSWORD = { step: "password" as const };

/* The screen is mounted as its route mounts it, and the step it shows is the
   one the server answers with. */
const asTheRouteMountsIt = () => {
  const store = configureStore({ reducer: { session: sessionReducer } });

  return () => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/recovery"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="recovery" element={<Recovery />} />
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
  render: asTheRouteMountsIt(),
  parameters: { msw: { handlers: [recoveryPositionRefuses()] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("button", { name: currentCopy().auth.recovery.retry });
  },
};

/* The eight below exist for the accessibility check and nothing else. Each puts
   one state on screen so axe evaluates it, and asserts only that it is there —
   what the state means is the component lane's. */

const askFor = async (canvas: ReturnType<typeof within>) => {
  await userEvent.type(
    await canvas.findByLabelText(currentCopy().auth.recovery.emailLabel),
    "holder@example.test",
  );
  await userEvent.click(canvas.getByRole("button", { name: currentCopy().auth.recovery.send }));
};

export const ThePositionIsBeingRead: Story = {
  render: asTheRouteMountsIt(),
  parameters: { msw: { handlers: [recoveryPositionNeverAnswers()] } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector("[class*='waiting']")).not.toBeNull(),
    );
  },
};

export const TheRequestRefused: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: {
      handlers: [recoveryPositionIs(AT_REQUEST), recoveryRequestRefuses(422, "validation")],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await askFor(canvas);
    await canvas.findByRole("alert");
  },
};

export const TheRequestLapsed: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_REQUEST), recoveryRequests(AT_REQUEST)] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await askFor(canvas);
    await canvas.findByText(currentCopy().auth.recovery.lapsed);
  },
};

export const TheRequestSending: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_REQUEST), recoveryRequestNeverAnswers()] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await askFor(canvas);
    await canvas.findByRole("button", { name: currentCopy().auth.recovery.sending });
  },
};

export const TheCodeRefused: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_CODE), recoveryConfirmRefuses(422, "validation")] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText(currentCopy().auth.recovery.codeLabel), "7QK3MNP2XVZB");
    await userEvent.click(canvas.getByRole("button", { name: currentCopy().auth.recovery.submitCode }));
    await canvas.findByRole("alert");
  },
};

export const TheCodeSubmitting: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_CODE), recoveryConfirmNeverAnswers()] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(await canvas.findByLabelText(currentCopy().auth.recovery.codeLabel), "7QK3MNP2XVZB");
    await userEvent.click(canvas.getByRole("button", { name: currentCopy().auth.recovery.submitCode }));
    await canvas.findByRole("button", { name: currentCopy().auth.recovery.submittingCode });
  },
};

const setPassword = async (canvas: ReturnType<typeof within>) => {
  await userEvent.type(
    await canvas.findByLabelText(currentCopy().auth.recovery.newPasswordLabel),
    "A-new-passw0rd!",
  );
  await userEvent.type(
    canvas.getByLabelText(currentCopy().auth.recovery.confirmPasswordLabel),
    "A-new-passw0rd!",
  );
  await userEvent.click(canvas.getByRole("button", { name: currentCopy().auth.recovery.submitPassword }));
};

export const ThePasswordRefused: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_PASSWORD), recoveryApplyRefuses(422, "validation")] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await setPassword(canvas);
    await canvas.findByRole("alert");
  },
};

export const ThePasswordSubmitting: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_PASSWORD), recoveryApplyNeverAnswers()] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await setPassword(canvas);
    await canvas.findByRole("button", { name: currentCopy().auth.recovery.submittingPassword });
  },
};

/* The four below exist for the accessibility check and nothing else: each
   renders a state whose only other renderer moved to the component lane. */

export const TheResendWindowIsOpen: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs({ ...AT_CODE, retryAfterSeconds: 42 })] },
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("button", {
      name: currentCopy().auth.recovery.resendIn(42),
    });
  },
};

export const TheResendIsSpent: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs({ ...AT_CODE, canResend: false })] },
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(currentCopy().auth.recovery.resendSpent);
  },
};

export const TheCodeStepConfirms: Story = {
  render: asTheRouteMountsIt(),
  parameters: {
    msw: { handlers: [recoveryPositionIs(AT_REQUEST), recoveryRequests(AT_CODE)] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText(currentCopy().auth.recovery.emailLabel),
      "holder@example.test",
    );
    await userEvent.click(canvas.getByRole("button", { name: currentCopy().auth.recovery.send }));
    await canvas.findByText(currentCopy().auth.recovery.sent);
  },
};

export const TheAddressStepAfterRestart: Story = {
  render: asTheRouteMountsIt(),
  parameters: { msw: { handlers: [recoveryPositionIs(AT_CODE)] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: currentCopy().auth.recovery.codeTitle });
    await userEvent.click(canvas.getByRole("button", { name: currentCopy().auth.recovery.startOver }));
    await canvas.findByRole("heading", { name: currentCopy().auth.recovery.requestTitle });
  },
};
