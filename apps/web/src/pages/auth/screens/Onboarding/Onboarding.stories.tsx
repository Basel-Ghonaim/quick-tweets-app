import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import {
  journeyAdvancesTo,
  journeyIs,
  journeyNeverAnswers,
  journeyRefuses,
} from "@testing/handlers/journey";
import { verificationIs } from "@testing/handlers/verification";
import { Onboarding } from "./Onboarding";
import { AuthLayout } from "../../layout";
import { sessionActions, sessionReducer } from "@shared/session";
import { currentCopy } from "@shared/copy";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const meta = {
  title: "Auth/Onboarding",
  component: Onboarding,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Onboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

/* The screen is mounted as its route mounts it, and the phase it shows is the
   one the server answers with. */
const asTheRouteMountsIt = (settled = true) => {
  const store = configureStore({ reducer: { session: sessionReducer } });
  if (settled) store.dispatch(sessionActions.sessionSettled());

  return () => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/onboarding"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="onboarding" element={<Onboarding />} />
            </Route>
            <Route path="/feed" element={<p>the feed</p>} />
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
  parameters: { msw: { handlers: [journeyRefuses()] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("button", { name: currentCopy().auth.onboarding.retry });
  },
};

/* The two below exist for the accessibility check and nothing else. Each puts
   one state on screen so axe evaluates it, and asserts only that it is there. */

export const ThePositionIsBeingRead: Story = {
  render: asTheRouteMountsIt(),
  parameters: { msw: { handlers: [journeyNeverAnswers()] } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector("[class*='pending']")).not.toBeNull(),
    );
  },
};

export const TheCodeStep: Story = {
  render: asTheRouteMountsIt(),
  // The code screen reads where the holder stands when it mounts, so the
  // journey's answer alone does not put this state on screen.
  parameters: { msw: { handlers: [journeyIs("code"), verificationIs("pending", 60)] } },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", { name: currentCopy().auth.verify.codeTitle });
  },
};

/* The two below exist for the accessibility check and nothing else: each
   renders a phase whose only other renderer moved to the component lane. */

export const TheProfileStep: Story = {
  render: asTheRouteMountsIt(),
  parameters: { msw: { handlers: [journeyIs("profile")] } },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", { name: currentCopy().auth.profile.title });
  },
};

export const TheVerifyStep: Story = {
  render: asTheRouteMountsIt(),
  // At `verify` the read asks the server to move to the code step, and the
  // state rendered is whatever that answers.
  parameters: { msw: { handlers: [journeyIs("verify"), journeyAdvancesTo("verify")] } },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", { name: currentCopy().auth.verify.askTitle });
  },
};
