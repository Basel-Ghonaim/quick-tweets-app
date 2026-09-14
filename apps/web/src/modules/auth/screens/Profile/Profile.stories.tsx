import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { createAppError } from "@shared/errors";
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

/* The five below exist for the accessibility check and nothing else. Each puts
   one state on screen so axe evaluates it, and asserts only that the state is
   there — what the state means is the component lane's. */

export const TheSaveRefused: Story = {
  decorators: [
    withState({
      uploadAvatar: async () => "token",
      updateProfile: async () => {
        throw createAppError("validation", "raw");
      },
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.profile.submit }));
    await canvas.findByRole("alert");
  },
};

export const TheSaveInFlight: Story = {
  decorators: [
    withState({ uploadAvatar: async () => "token", updateProfile: () => new Promise(() => {}) }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.profile.submit }));
    await canvas.findByRole("button", { name: AUTH_COPY.profile.submitting });
  },
};

export const ThePictureUploading: Story = {
  decorators: [withState({ uploadAvatar: () => new Promise(() => {}), updateProfile: () => new Promise(() => {}) })],
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>("input[type='file']")!;

    // Assigned rather than clicked: the avatar's native input is deliberately
    // `pointer-events: none`, so a pointer-driven upload cannot reach it.
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    input.files = transfer.files;
    fireEvent.change(input);

    await waitFor(() => expect(canvasElement.querySelector("[role='status']")!.textContent).not.toBe(""));
  },
};

const choosePicture = (canvasElement: HTMLElement) => {
  const input = canvasElement.querySelector<HTMLInputElement>("input[type='file']")!;
  const transfer = new DataTransfer();
  transfer.items.add(new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
  input.files = transfer.files;
  fireEvent.change(input);
};

export const ThePictureUploaded: Story = {
  decorators: [
    withState({ uploadAvatar: async () => "token", updateProfile: () => new Promise(() => {}) }),
  ],
  play: async ({ canvasElement }) => {
    choosePicture(canvasElement);
    await within(canvasElement).findByText(AUTH_COPY.profile.uploaded);
  },
};

export const ThePictureRejected: Story = {
  decorators: [
    withState({
      uploadAvatar: async () => {
        throw createAppError("validation", "raw");
      },
      updateProfile: () => new Promise(() => {}),
    }),
  ],
  play: async ({ canvasElement }) => {
    choosePicture(canvasElement);
    await within(canvasElement).findByRole("button", { name: AUTH_COPY.profile.uploadRetry });
  },
};
