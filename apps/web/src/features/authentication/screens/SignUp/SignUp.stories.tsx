import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { SignUp } from "./SignUp";
import { AuthLayout } from "@pages/auth/layout";
import { JourneyLayout } from "@pages/auth/layout/JourneyLayout";
import { sessionReducer } from "@shared/session";
import { authenticationReducer, authenticationActions } from "../../store";
import { currentCopy } from "@shared/copy";
import { stepStates } from "@pages/auth/services";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const meta = {
  title: "Auth/Sign up",
  component: SignUp,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof SignUp>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A store per story, seeded with the request state the story is about, so the
 *  screen is driven by the real slice rather than by props it does not take. */
const withState = (seed?: (dispatch: ReturnType<typeof configureStore>["dispatch"]) => void) => {
  const store = configureStore({ reducer: { session: sessionReducer, authentication: authenticationReducer } });
  seed?.(store.dispatch);

  return (Story: () => React.ReactElement) => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/signup"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route
                element={<JourneyLayout states={stepStates("account", null)}><Outlet /></JourneyLayout>}
              >
                <Route path="signup" element={<SignUp />} />
              </Route>
            </Route>
            <Route path="*" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

const fieldLabels = () => {
  const { usernameLabel, emailLabel, passwordLabel, confirmPasswordLabel } = currentCopy().auth.signUp;
  return [usernameLabel, emailLabel, passwordLabel, confirmPasswordLabel];
};

export const Idle: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("heading", { name: currentCopy().auth.signUp.title })).toBeVisible();

    for (const label of fieldLabels()) {
      await expect(canvas.getByLabelText(label)).toBeVisible();
    }

    await expect(canvas.getByRole("button", { name: currentCopy().auth.signUp.submit })).toBeVisible();

    for (const name of [currentCopy().auth.signUp.backToLogin, currentCopy().auth.signUp.browseAsGuest]) {
      await expect(canvas.getByRole("link", { name })).toBeVisible();
    }

    /* Everything that is not the primary action carries no fill, so the count
       is what says the hierarchy holds. */
    await expect(canvasElement.querySelectorAll("button[type='submit']")).toHaveLength(1);
  },
};

/** The stepper is the layout's, and it reads the journey from the path. */
export const TheJourneyBeginsAtAccount: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const account = canvas.getByText(currentCopy().auth.journey.steps.account).closest("li");
    await expect(account).toHaveAttribute("aria-current", "step");
    await expect(within(account as HTMLElement).getByText(currentCopy().auth.journey.states.current)).toBeVisible();
  },
};

export const AServerErrorIsAnnounced: Story = {
  decorators: [
    withState((dispatch) =>
      dispatch(
        authenticationActions.requestRejected({
          requestType: "register",
          error: {
            type: "conflict",
            message: "This account is already registered. Try logging in.",
            status: 409,
          },
        }),
      ),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const region = canvas.getByRole("alert");
    await expect(region).toHaveTextContent("This account is already registered. Try logging in.");
  },
};

export const SubmittingIsReportedInPlace: Story = {
  decorators: [
    withState((dispatch) => dispatch(authenticationActions.requestPending({ requestType: "register" }))),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: currentCopy().auth.signUp.submitting }),
    ).toBeVisible();
  },
};

/** The viewport global resizes the real viewport, so the query fires. */
export const Compact: Story = {
  decorators: [withState()],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);

    const password = canvas.getByLabelText(currentCopy().auth.signUp.passwordLabel);
    const confirm = canvas.getByLabelText(currentCopy().auth.signUp.confirmPasswordLabel);

    /* Stacked, so the second field starts below the first rather than beside
       it — the pairing measured rather than asserted from the rule. */
    await expect(password.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      confirm.getBoundingClientRect().top,
    );
  },
};

/** Above the compact width the two share a row, which is the pairing the
 *  screen's grid exists for. */
export const ThePasswordFieldsShareARow: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const password = canvas.getByLabelText(currentCopy().auth.signUp.passwordLabel);
    const confirm = canvas.getByLabelText(currentCopy().auth.signUp.confirmPasswordLabel);

    await expect(password.getBoundingClientRect().top).toBeCloseTo(
      confirm.getBoundingClientRect().top,
      0,
    );
  },
};
