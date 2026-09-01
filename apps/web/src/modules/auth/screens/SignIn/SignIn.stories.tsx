import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { SignIn } from "./SignIn";
import { AuthShell } from "../../AuthShell";
import { AuthDesignProvider } from "../../_design";
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
  title: "Auth/Sign in",
  component: SignIn,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof SignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A store per story, seeded with the request state the story is about, so the
 *  screen is driven by the real slice rather than by props it does not take. */
const withState = (seed?: (dispatch: ReturnType<typeof configureStore>["dispatch"]) => void) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  seed?.(store.dispatch);

  return (Story: () => React.ReactElement) => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/signin?design=proposed"]}>
          <Routes>
            <Route
              path="/auth"
              element={
                <AuthDesignProvider showToggle={false}>
                  <AuthShell />
                </AuthDesignProvider>
              }
            >
              <Route path="signin" element={<SignIn />} />
            </Route>
            <Route path="*" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

export const Idle: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("heading", { name: AUTH_COPY.signIn.title })).toBeVisible();
    await expect(canvas.getByLabelText(/username or email/i)).toBeVisible();
    await expect(canvas.getByLabelText(/^password$/i)).toBeVisible();
    await expect(canvas.getByRole("button", { name: AUTH_COPY.signIn.submit })).toBeVisible();

    // The three ways on, all of them links because all three leave this screen.
    for (const name of [
      AUTH_COPY.signIn.forgotPassword,
      AUTH_COPY.signIn.createAccount,
      AUTH_COPY.signIn.browseAsGuest,
    ]) {
      await expect(canvas.getByRole("link", { name })).toBeVisible();
    }

    // One action moves the journey on. Counting buttons would count the
    // password reveal and the shell's theme control, which move nothing.
    await expect(canvasElement.querySelectorAll("button[type='submit']")).toHaveLength(1);
  },
};

/** A failed sign-in belongs to no single field, so it is announced about the form. */
export const AServerErrorIsAnnounced: Story = {
  decorators: [
    withState((dispatch) =>
      dispatch(
        authActions.authRequestRejected({
          requestType: "login",
          error: {
            type: "unauthorized",
            message: "Incorrect username/email or password.",
            status: 401,
          },
        }),
      ),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("alert");

    await expect(region).toHaveTextContent("Incorrect username/email or password.");
  },
};

/** The submit reports its own busy state rather than a full-screen overlay. */
export const SubmittingIsReportedInPlace: Story = {
  decorators: [
    withState((dispatch) => dispatch(authActions.authRequestPending({ requestType: "login" }))),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: AUTH_COPY.signIn.submitting }),
    ).toBeVisible();
  },
};

/** The same screen at a phone width, where the pitch gives up its place. */
export const Compact: Story = {
  decorators: [withState()],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);
    await expect(canvas.getByRole("heading", { name: AUTH_COPY.signIn.title })).toBeVisible();
    await expect(canvas.getByTestId("brand-posts")).not.toBeVisible();
  },
};
