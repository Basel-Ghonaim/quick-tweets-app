import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { Profile } from "./Profile";
import { AuthLayout } from "../../layout";
import { JourneyLayout } from "../../layout/JourneyLayout";
import type { ProfileGateway } from "@features/profile";
import { sessionReducer } from "@shared/session";
import { AUTH_COPY } from "@shared/copy";
import { stepStates } from "../../components/Stepper";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const noop = () => {};

const meta = {
  title: "Auth/Profile",
  component: Profile,
  args: { onSettled: noop },
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Profile>;

export default meta;
type Story = StoryObj<typeof meta>;

const withState = (
  repo?: ProfileGateway,
  settled?: (outcome: "saved" | "skipped") => void,
) => {
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
                  <JourneyLayout states={stepStates("profile", null)}>
                    <Profile onSettled={settled ?? noop} repo={repo} />
                  </JourneyLayout>
                }
              />
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

    await expect(canvas.getByRole("heading", { name: AUTH_COPY.profile.title })).toBeVisible();
    await expect(canvas.getByLabelText(/display name/i)).toBeVisible();
    await expect(canvas.getByLabelText(/^bio$/i)).toBeVisible();
    await expect(canvas.getByLabelText(AUTH_COPY.profile.avatarLabel)).toBeInTheDocument();

    await expect(canvas.getByRole("button", { name: AUTH_COPY.profile.submit })).toBeVisible();
    await expect(canvas.getByRole("button", { name: AUTH_COPY.profile.skip })).toBeVisible();

    /* Everything that is not the primary action carries no fill. */
    await expect(canvasElement.querySelectorAll("button[type='submit']")).toHaveLength(1);
  },
};

/** The stepper is the layout's, and it reads the journey from the path. */
export const TheJourneyIsAtProfile: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const profile = canvas.getByText(AUTH_COPY.journey.steps.profile).closest("li");
    await expect(profile).toHaveAttribute("aria-current", "step");

    const account = canvas.getByText(AUTH_COPY.journey.steps.account).closest("li");
    await expect(
      within(account as HTMLElement).getByText(AUTH_COPY.journey.states.done),
    ).toBeVisible();
  },
};

/** The limit is legible while there is still time to write to it. */
export const TheBioCountTracksWhatIsTyped: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(AUTH_COPY.profile.bioCount(0, 160))).toBeInTheDocument();

    await userEvent.type(canvas.getByLabelText(/^bio$/i), "hello");

    await waitFor(() =>
      expect(canvas.getByText(AUTH_COPY.profile.bioCount(5, 160))).toBeInTheDocument(),
    );
  },
};

export const Compact: Story = {
  decorators: [withState()],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);
    await expect(canvas.getByRole("heading", { name: AUTH_COPY.profile.title })).toBeVisible();
    await expect(canvas.getByRole("button", { name: AUTH_COPY.profile.submit })).toBeVisible();
  },
};
