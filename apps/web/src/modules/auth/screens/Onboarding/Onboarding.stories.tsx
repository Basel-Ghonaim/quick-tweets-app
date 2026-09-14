import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { createAppError } from "@shared/errors";
import { Onboarding } from "./Onboarding";
import { AuthLayout } from "@pages/auth/layout";
import { sessionActions, sessionReducer } from "@shared/session";
import { AUTH_COPY } from "@shared/copy";
import type { JourneyGateway, JourneyState } from "@features/journey";

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

const state = (over: Partial<JourneyState> = {}): JourneyState => ({
  phase: "profile",
  profileOutcome: null,
  ...over,
});

const withRepo = (repo: JourneyGateway, settled = true) => {
  const store = configureStore({ reducer: { session: sessionReducer } });
  if (settled) store.dispatch(sessionActions.sessionSettled());

  return () => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/onboarding"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="onboarding" element={<Onboarding repo={repo} />} />
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
  render: withRepo({
    read: async () => {
      throw createAppError("network", "Offline");
    },
    advance: async () => state(),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("button", { name: AUTH_COPY.onboarding.retry });
  },
};

/* The two below exist for the accessibility check and nothing else. Each puts
   one state on screen so axe evaluates it, and asserts only that it is there. */

export const ThePositionIsBeingRead: Story = {
  render: withRepo({ read: () => new Promise(() => {}), advance: async () => state() }),
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector("[class*='pending']")).not.toBeNull(),
    );
  },
};

export const TheCodeStep: Story = {
  render: withRepo({ read: async () => state({ phase: "code" }), advance: async () => state() }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", { name: AUTH_COPY.verify.codeTitle });
  },
};

/* The two below exist for the accessibility check and nothing else: each
   renders a phase whose only other renderer moved to the component lane. */

export const TheProfileStep: Story = {
  render: withRepo({ read: async () => state({ phase: "profile" }), advance: async () => state() }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", { name: AUTH_COPY.profile.title });
  },
};

export const TheVerifyStep: Story = {
  render: withRepo({
    read: async () => state({ phase: "verify" }),
    advance: async () => state({ phase: "verify" }),
  }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("heading", { name: AUTH_COPY.verify.askTitle });
  },
};
