import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { Verify } from "./Verify";
import { AuthShell } from "../../AuthShell";
import { AuthDesignProvider } from "../../_design";
import { JourneyLayout } from "../../layout/JourneyLayout";
import { authReducer, authActions } from "../../store";
import { AUTH_COPY } from "../../config/copy";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const meta = {
  title: "Auth/Verify",
  component: Verify,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Verify>;

export default meta;
type Story = StoryObj<typeof meta>;

const withState = (seed?: (dispatch: ReturnType<typeof configureStore>["dispatch"]) => void) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  seed?.(store.dispatch);

  return (Story: () => React.ReactElement) => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/verify?design=proposed"]}>
          <Routes>
            <Route
              path="/auth"
              element={
                <AuthDesignProvider showToggle={false}>
                  <AuthShell />
                </AuthDesignProvider>
              }
            >
              <Route element={<JourneyLayout />}>
                <Route path="verify" element={<Verify />} />
              </Route>
            </Route>
            <Route path="*" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

/** Nothing is sent until it is asked for: an optional step that mailed everyone
 *  who reached it would be behaving like a mandatory one. */
export const TheAskComesFirst: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("heading", { name: AUTH_COPY.verify.askTitle })).toBeVisible();
    await expect(canvas.getByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
    await expect(canvas.getByText(AUTH_COPY.verify.reason)).toBeVisible();

    /* No field until a code exists to type into it. */
    await expect(canvas.queryByLabelText(AUTH_COPY.verify.codeLabel)).not.toBeInTheDocument();
  },
};

/** Later leaves the journey from either state, and nothing offers a way back. */
export const LaterLeavesTheJourney: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const later = canvas.getByRole("link", { name: AUTH_COPY.verify.later });
    await expect(later).toBeVisible();
    await expect(later).toHaveAttribute("href", expect.stringContaining("/feed"));

    await expect(canvas.queryByRole("link", { name: /back/i })).not.toBeInTheDocument();
  },
};

export const SendingIsReportedInPlace: Story = {
  decorators: [
    withState((dispatch) => dispatch(authActions.authRequestPending({ requestType: "issueCode" }))),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("button", { name: AUTH_COPY.verify.sending })).toBeVisible();
  },
};

/** The address cooldown and the client limiter are different refusals, and the
 *  screen says so in its own words rather than a form's. */
export const TheCooldownRefusalSaysWhatItIs: Story = {
  decorators: [
    withState((dispatch) =>
      dispatch(
        authActions.authRequestRejected({
          requestType: "issueCode",
          error: {
            type: "too_many_requests",
            message: AUTH_COPY.verify.cooldownRefused,
            status: 429,
          },
        }),
      ),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent(AUTH_COPY.verify.cooldownRefused);
  },
};

export const TheClientLimiterSaysSomethingElse: Story = {
  decorators: [
    withState((dispatch) =>
      dispatch(
        authActions.authRequestRejected({
          requestType: "issueCode",
          error: { type: "rate_limit", message: AUTH_COPY.verify.rateLimited, status: 429 },
        }),
      ),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent(AUTH_COPY.verify.rateLimited);
    await expect(alert).not.toHaveTextContent(AUTH_COPY.verify.cooldownRefused);
  },
};

export const Compact: Story = {
  decorators: [withState()],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);
    await expect(canvas.getByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
  },
};

/** The stepper is the layout's, and it reads the journey from the path. */
export const TheJourneyIsAtVerify: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const verify = canvas.getByText(AUTH_COPY.journey.steps.verify).closest("li");
    await expect(verify).toHaveAttribute("aria-current", "step");
  },
};

/** Typing the code raises it, drops separators, and reads the ambiguous letters
 *  as digits — the server normalises none of that and rejects opaquely. */
export const TheCodeFieldForgivesWhatIsTyped: Story = {
  decorators: [
    withState((dispatch) =>
      dispatch(authActions.authRequestFulfilled({ requestType: "issueCode" })),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const field = await canvas.findByLabelText(AUTH_COPY.verify.codeLabel);
    await userEvent.type(field, "7qk3-mnp2 xvzo");

    await waitFor(() => expect(field).toHaveValue("7QK3MNP2XVZ0"));
  },
};
