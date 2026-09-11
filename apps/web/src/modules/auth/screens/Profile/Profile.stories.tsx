import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { Profile } from "./Profile";
import { AuthLayout } from "../../layout";
import { JourneyLayout } from "../../layout/JourneyLayout";
import { createAppError } from "@shared/errors";
import type { ProfileRepository } from "../../profile";
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
  repo?: ProfileRepository,
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

export const AServerErrorIsAnnounced: Story = {
  decorators: [
    withState({
      updateProfile: async () => {
        throw createAppError("validation", "raw");
      },
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.profile.submit }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).not.toHaveTextContent("raw");
  },
};

export const SavingIsReportedInPlace: Story = {
  decorators: [
    withState({ updateProfile: () => new Promise(() => {}) }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.profile.submit }));

    await expect(
      await canvas.findByRole("button", { name: AUTH_COPY.profile.submitting }),
    ).toBeVisible();
  },
};

/** Skipping is the absence of a request, so nothing about the update moves. */
export const SkippingIssuesNoRequest: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.profile.skip }));

    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: AUTH_COPY.profile.submit }),
    ).toBeEnabled();
  },
};

/** The upload runs on selection, so its states are reachable without a submit. */
export const ChoosingAPictureStartsTheUpload: Story = {
  decorators: [withState()],
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>("input[type='file']")!;

    // Assigned rather than clicked: the avatar's native input is deliberately
    // `pointer-events: none`, so a pointer-driven upload cannot reach it.
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    input.files = transfer.files;
    fireEvent.change(input);

    const live = canvasElement.querySelector("[role='status']")!;
    await waitFor(() => expect(live.textContent).not.toBe(""));
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
