import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { GuestOnly } from "./GuestOnly";
import { authReducer, authActions } from "../store";

const meta = {
  title: "Auth/Guest only",
  component: GuestOnly,
  /* Every story supplies the real subject through its decorator; this only
     satisfies the required prop. */
  args: { children: <p>the account form</p> },
} satisfies Meta<typeof GuestOnly>;

export default meta;
type Story = StoryObj<typeof meta>;

const at = (signedIn: boolean) => (Story: () => React.ReactElement) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  // The guard waits for the restore to answer before it decides anything.
  store.dispatch(authActions.sessionSettled());

  if (signedIn) {
    store.dispatch(
      authActions.authRequestFulfilled({
        requestType: "login",
        user: { id: 1, username: "ada" },
        accessToken: "a-token",
      }),
    );
  }

  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={["/auth/signup"]}>
        <Routes>
          <Route
            path="/auth/signup"
            element={
              <GuestOnly>
                <p>the account form</p>
              </GuestOnly>
            }
          />
          <Route path="/feed" element={<p>the feed</p>} />
          <Route path="*" element={<Story />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

export const AGuestReachesTheForm: Story = {
  decorators: [at(false)],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("the account form")).toBeVisible();
  },
};

/** An account already exists, so the screen that creates one is not for them —
 *  however they arrived, including by typing the path. */
export const AnAccountHolderIsSentOn: Story = {
  decorators: [at(true)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText("the account form")).not.toBeInTheDocument();
    await expect(canvas.getByText("the feed")).toBeVisible();
  },
};

/**
 * Before the restore answers, a signed-out reader and one whose session has not
 * been fetched yet look identical — so the form is not shown to either. Showing
 * it and correcting afterwards is what flashed the account form at an account
 * holder for a whole round trip.
 */
export const NothingIsShownBeforeTheAnswer: Story = {
  decorators: [
    (Story: () => React.ReactElement) => {
      const store = configureStore({ reducer: { auth: authReducer } });

      return (
        <Provider store={store}>
          <MemoryRouter initialEntries={["/auth/signup"]}>
            <Routes>
              <Route
                path="/auth/signup"
                element={
                  <GuestOnly>
                    <p>the account form</p>
                  </GuestOnly>
                }
              />
              <Route path="/feed" element={<p>the feed</p>} />
              <Route path="*" element={<Story />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText("the account form")).not.toBeInTheDocument();
    await expect(canvas.queryByText("the feed")).not.toBeInTheDocument();
  },
};
