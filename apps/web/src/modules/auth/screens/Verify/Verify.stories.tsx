import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { VerifyAsk } from "./VerifyAsk";
import { VerifyCode } from "./VerifyCode";
import { AuthLayout } from "../../layout";
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
  component: VerifyAsk,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof VerifyAsk>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The route is the state, so a story arrives at one rather than seeding it. */
const at = (
  entry: string,
  seed?: (dispatch: ReturnType<typeof configureStore>["dispatch"]) => void,
) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  seed?.(store.dispatch);

  return (Story: () => React.ReactElement) => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route element={<JourneyLayout />}>
                <Route path="verify">
                  <Route index element={<VerifyAsk />} />
                  <Route path="code" element={<VerifyCode />} />
                </Route>
              </Route>
            </Route>
            <Route path="/feed" element={<p>the feed</p>} />
            <Route path="*" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

const ASK = "/auth/verify";
const CODE = "/auth/verify/code";

/** What the ask hands over when it leaves. */
const carrying = (seconds: number) => ({
  pathname: "/auth/verify/code",
  state: { resendAvailableInSeconds: seconds },
});

/** Nothing is sent until it is asked for: an optional step that mailed everyone
 *  who reached it would be behaving like a mandatory one. */
export const TheAskComesFirst: Story = {
  decorators: [at(ASK)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.verify.askTitle }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
    await expect(canvas.queryByLabelText(AUTH_COPY.verify.codeLabel)).not.toBeInTheDocument();
  },
};

/** One step back, and only from here: a code already sent is not something to
 *  walk back from, and the account step is closed for good. */
export const TheAskLooksBackOneStep: Story = {
  decorators: [at(ASK)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const back = await canvas.findByRole("link", { name: AUTH_COPY.verify.backToProfile });
    await expect(back).toHaveAttribute("href", expect.stringContaining("/auth/profile"));
  },
};

/** The code screen stands alone, so a reload keeps the field for a code already
 *  in the reader's inbox. */
export const TheCodeScreenIsItsOwnRoute: Story = {
  decorators: [at(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.verify.codeTitle }),
    ).toBeVisible();
    await expect(canvas.getByLabelText(AUTH_COPY.verify.codeLabel)).toBeVisible();
  },
};

/** There is no way back from here, only on or out. */
export const TheCodeScreenOffersNoWayBack: Story = {
  decorators: [at(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByLabelText(AUTH_COPY.verify.codeLabel);
    await expect(
      canvas.queryByRole("link", { name: AUTH_COPY.verify.backToProfile }),
    ).not.toBeInTheDocument();
  },
};

export const SendingIsReportedInPlace: Story = {
  decorators: [
    at(ASK, (dispatch) => dispatch(authActions.authRequestPending({ requestType: "issueCode" }))),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("button", { name: AUTH_COPY.verify.sending }),
    ).toBeVisible();
  },
};

/** The address cooldown and the client limiter are different refusals, and the
 *  screen says so in its own words rather than a form's. */
export const TheCooldownRefusalSaysWhatItIs: Story = {
  decorators: [
    at(ASK, (dispatch) =>
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

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      AUTH_COPY.verify.cooldownRefused,
    );
  },
};

export const TheClientLimiterSaysSomethingElse: Story = {
  decorators: [
    at(ASK, (dispatch) =>
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

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(AUTH_COPY.verify.rateLimited);
    await expect(alert).not.toHaveTextContent(AUTH_COPY.verify.cooldownRefused);
  },
};

/** Typing the code raises it, drops separators, and reads the ambiguous letters
 *  as digits — the server normalises none of that and rejects opaquely. */
export const TheCodeFieldForgivesWhatIsTyped: Story = {
  decorators: [at(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const field = await canvas.findByLabelText(AUTH_COPY.verify.codeLabel);
    await userEvent.type(field, "7qk3-mnp2 xvzo");

    await waitFor(() => expect(field).toHaveValue("7QK3MNP2XVZ0"));
  },
};

/** The stepper is the layout's, and both routes belong to the same step. */
export const BothRoutesAreTheSameStep: Story = {
  decorators: [at(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const verify = canvas.getByText(AUTH_COPY.journey.steps.verify).closest("li");
    await expect(verify).toHaveAttribute("aria-current", "step");
  },
};

/** The window the ask was told is spent here: without the hand-off the screen
 *  opens with resend enabled and no wait, which is the opposite of the truth. */
export const TheWaitSurvivesTheHandOver: Story = {
  decorators: [at(carrying(60) as never)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const resend = await canvas.findByRole("button", {
      name: AUTH_COPY.verify.resendIn(60),
    });
    await expect(resend).toBeDisabled();
  },
};

/** Arriving cold — a reload — the wait is unknown, so the control is open and
 *  the first press is what asks the server for it. */
export const ArrivingColdTheWaitIsUnknown: Story = {
  decorators: [at(CODE)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("button", { name: AUTH_COPY.verify.resend }),
    ).toBeEnabled();
  },
};

export const Compact: Story = {
  decorators: [at(ASK)],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);
    await expect(await canvas.findByRole("button", { name: AUTH_COPY.verify.send })).toBeVisible();
  },
};
