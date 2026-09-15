import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { sessionActions, sessionReducer } from "@shared/session";
import { AUTH_COPY } from "@shared/copy";
import { journeyIs } from "@testing/handlers/journey";
import { Onboarding } from "./Onboarding";
import { AuthLayout } from "../../layout";

/*
 * PROOF ARTIFACT — deleted when the real Onboarding stories are converted.
 * It holds the browser half of the infrastructure honest: the same
 * origin-agnostic handlers the component lane uses, against a screen mounted
 * exactly as its route mounts it.
 */

const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

/* No `repo`. The screen is mounted exactly as the route mounts it. */
const asTheRouteMountsIt = () => {
  const store = configureStore({ reducer: { session: sessionReducer } });
  store.dispatch(sessionActions.sessionSettled());

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

const meta = {
  title: "Auth/Onboarding (network proof)",
  component: Onboarding,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Onboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TheProfileStep: Story = {
  render: asTheRouteMountsIt(),
  parameters: { msw: { handlers: [journeyIs("profile")] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.profile.title });
    await expect(canvas.getByText(AUTH_COPY.journey.steps.profile)).toBeVisible();
  },
};
