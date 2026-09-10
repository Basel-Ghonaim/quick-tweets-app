import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { createAppError } from "@shared/errors";
import { Recovery } from "./Recovery";
import { AuthLayout } from "../../layout";
import { authReducer } from "@features/session";
import { AUTH_COPY } from "@shared/copy";
import type { RecoveryPosition } from "../entity";
import type { RecoveryRepository } from "../repository";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const meta = {
  title: "Auth/Recovery",
  component: Recovery,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Recovery>;

export default meta;
type Story = StoryObj<typeof meta>;

const at = (over: Partial<RecoveryPosition> = {}): RecoveryPosition => ({
  step: "code",
  maskedAddress: "h•••••@example.test",
  resendAvailableIn: 0,
  canResend: true,
  ...over,
});

const repository = (over: Partial<RecoveryRepository> = {}): RecoveryRepository => ({
  position: async () => at(),
  request: async () => at(),
  resend: async () => at(),
  confirm: async () => {},
  apply: async () => {},
  ...over,
});

const withRepo = (repo: RecoveryRepository) => {
  const store = configureStore({ reducer: { auth: authReducer } });

  return () => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/recovery"]}>
          <Routes>
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="recovery" element={<Recovery repo={repo} />} />
              <Route path="signin" element={<p>sign in</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

/** Each step renders because the server said so, never because the client
 *  tracked how far the reader had got. */
export const TheStepChoosesTheScreen: Story = {
  render: withRepo(repository({ position: async () => at({ step: "request" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeVisible();
  },
};

/** A reload at the code step lands on the code step, which is the whole reason
 *  the position lives on the server. */
export const AReloadKeepsThePlace: Story = {
  render: withRepo(repository({ position: async () => at({ step: "code" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle }),
    ).toBeVisible();
    // The address the reader sees is the server's mask, never what they typed.
    await expect(canvas.getByText(/h•••••@example\.test/)).toBeVisible();
  },
};

/** And at the password step it is able to FINISH, not merely to look at it. */
export const AReloadAtThePasswordStepCanStillFinish: Story = {
  render: withRepo(repository({ position: async () => at({ step: "password" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: AUTH_COPY.recovery.submitPassword }),
    ).toBeEnabled();
  },
};

/* Without the shell: the comparison is about the screen's own output, and two
   layouts in one document would be two banner landmarks. */
const bare = (repo: RecoveryRepository) => {
  const store = configureStore({ reducer: { auth: authReducer } });

  return () => (
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/auth/recovery"]}>
          <Recovery repo={repo} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

/**
 * The one thing a screen can leak that the API cannot.
 *
 * Two different addresses are typed, and the server answers both with the same
 * position — which is what it does, since the mask is of whatever was submitted
 * and nothing else varies. A screen that echoed what the reader typed rather
 * than the mask it was given would make these two differ, which is the
 * documented incident this guards against.
 */
const answersBothAlike = repository({
  position: async () => at({ step: "request" }),
  request: async () => at({ step: "code" }),
});

export const NeitherAddressIsEchoedBack: Story = {
  render: () => {
    const Harness = () => {
      const [Known] = useState(() => bare(answersBothAlike));
      const [Unknown] = useState(() => bare(answersBothAlike));

      return (
        <>
          <div data-testid="known">
            <Known />
          </div>
          <div data-testid="unknown">
            <Unknown />
          </div>
        </>
      );
    };

    return <Harness />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const known = within(canvas.getByTestId("known"));
    const unknown = within(canvas.getByTestId("unknown"));

    await userEvent.type(
      await known.findByLabelText(AUTH_COPY.recovery.emailLabel),
      "holder@example.test",
    );
    await userEvent.click(known.getByRole("button", { name: AUTH_COPY.recovery.send }));

    await userEvent.type(
      await unknown.findByLabelText(AUTH_COPY.recovery.emailLabel),
      "nobody-at-all@elsewhere.test",
    );
    await userEvent.click(unknown.getByRole("button", { name: AUTH_COPY.recovery.send }));

    await known.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    await unknown.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });

    await expect(canvas.getByTestId("known").textContent).toEqual(
      canvas.getByTestId("unknown").textContent,
    );
  },
};

/** A submitted address produces the confirmation, and it says nothing about
 *  whether an account holds it. */
export const TheConfirmationSaysNothingAboutTheAccount: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: async () => at({ step: "code" }),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel),
      "someone@example.test",
    );
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.send }));

    const confirmation = await canvas.findByText(AUTH_COPY.recovery.sent);
    await expect(confirmation).toBeVisible();
    // Announced rather than merely drawn, and politely: it is not a failure.
    await expect(confirmation.closest("[role='status']")).not.toBeNull();
  },
};

/** A read that failed is not an answer of `request`: offering the first screen
 *  would discard a recovery the server still holds. */
export const AFailedReadOffersARetry: Story = {
  render: withRepo(
    repository({
      position: async () => {
        throw createAppError("network", "offline");
      },
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(AUTH_COPY.recovery.unavailable)).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: AUTH_COPY.recovery.retry }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeNull();
  },
};

/** The window is the server's. A position still inside it offers no resend, and
 *  the seconds shown are the ones it reported. */
export const TheResendWindowIsTheServersOwn: Story = {
  render: withRepo(
    repository({ position: async () => at({ step: "code", resendAvailableIn: 42 }) }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const resend = await canvas.findByRole("button", {
      name: AUTH_COPY.recovery.resendIn(42),
    });
    await expect(resend).toBeDisabled();
  },
};

/**
 * A spent bound says so in text and leaves the way out enabled. Putting that
 * sentence on a disabled control would name an action the screen does not
 * offer, which is the shape this guards against.
 */
export const ASpentBoundStillHasAWayOut: Story = {
  render: withRepo(
    repository({ position: async () => at({ step: "code", canResend: false }) }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(AUTH_COPY.recovery.resendSpent)).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: AUTH_COPY.recovery.startOver }),
    ).toBeEnabled();
    // No resend control at all, rather than one that cannot be used.
    await expect(
      canvas.queryByRole("button", { name: AUTH_COPY.recovery.resend }),
    ).toBeNull();
  },
};

/**
 * A mistyped address is the likeliest reason a code never arrives, and without
 * a way back the whole flow is thrown away to fix one character.
 *
 * The control does not claim a step: the server still says `code`, and what
 * moves it is the request the address form then makes.
 */
export const AMistypedAddressCanBeCorrected: Story = {
  render: withRepo(repository({ position: async () => at({ step: "code" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    await userEvent.click(
      canvas.getByRole("button", { name: AUTH_COPY.recovery.startOver }),
    );

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle }),
    ).toBeVisible();
    await expect(canvas.getByLabelText(AUTH_COPY.recovery.emailLabel)).toBeVisible();
  },
};

/** Correcting a typo should cost one character, not the whole address. */
export const TheAddressComesBackWhenCorrecting: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: async () => at({ step: "code" }),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const typed = "holder@example.test";

    await userEvent.type(await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel), typed);
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.send }));
    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.startOver }));

    await expect(await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel)).toHaveValue(typed);
  },
};

/** Correcting an address abandons an attempt rather than moving a step, so
 *  submitting the corrected one returns the reader to where the server says. */
export const ACorrectedAddressReturnsToTheCode: Story = {
  render: withRepo(
    repository({
      position: async () => at({ step: "request" }),
      request: async () => at({ step: "code" }),
    }),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel),
      "holder@example.test",
    );
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.send }));
    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });

    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.startOver }));
    await canvas.findByLabelText(AUTH_COPY.recovery.emailLabel);
    await userEvent.click(canvas.getByRole("button", { name: AUTH_COPY.recovery.send }));

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle }),
    ).toBeVisible();
  },
};

/** Every step offers a way out, and it is a link because sign in has an address. */
export const EveryStepCanBeLeft: Story = {
  render: withRepo(repository({ position: async () => at({ step: "code" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.codeTitle });
    await expect(
      canvas.getByRole("link", { name: AUTH_COPY.recovery.backToLogin }),
    ).toHaveAttribute("href", "/auth/signin");
  },
};

/** Including the last one, where leaving is safe and starting over is not. */
export const ThePasswordStepCanBeLeftButNotRestarted: Story = {
  render: withRepo(repository({ position: async () => at({ step: "password" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle });
    await expect(
      canvas.getByRole("link", { name: AUTH_COPY.recovery.backToLogin }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: AUTH_COPY.recovery.startOver }),
    ).toBeNull();
  },
};

/** The position's mask belongs to the step that asks for a code, not the one
 *  that sets a password. */
export const ThePasswordStepShowsNoAddress: Story = {
  render: withRepo(repository({ position: async () => at({ step: "password" }) })),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle });
    await expect(canvas.queryByText(/•/)).toBeNull();
  },
};

/** The position is asked for once, not once per render — a repository rebuilt
 *  each time would key the read effect afresh and never settle. */
export const ThePositionIsAskedForOnce: Story = {
  render: () => {
    const Harness = () => {
      const [reads, setReads] = useState(0);
      const [Mounted] = useState(() =>
        withRepo(
          repository({
            position: async () => {
              setReads((n) => n + 1);
              return at({ step: "request" });
            },
          }),
        ),
      );

      return (
        <>
          <Mounted />
          <p data-testid="reads">{String(reads)}</p>
        </>
      );
    };

    return <Harness />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByRole("heading", { name: AUTH_COPY.recovery.requestTitle });
    await new Promise((resolve) => setTimeout(resolve, 150));

    await expect(canvas.getByTestId("reads")).toHaveTextContent("1");
  },
};

/** Confirming does not decide the step: the server is asked again, and what it
 *  says is what renders. */
export const ConfirmingReReadsRatherThanAssuming: Story = {
  render: () => {
    const Harness = () => {
      const [Mounted] = useState(() => {
        let confirmed = false;

        return withRepo(
          repository({
            position: async () => at({ step: confirmed ? "password" : "code" }),
            confirm: async () => {
              confirmed = true;
            },
          }),
        );
      });

      return <Mounted />;
    };

    return <Harness />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      await canvas.findByLabelText(AUTH_COPY.recovery.codeLabel),
      "7qk3-mnp2-xvzb",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: AUTH_COPY.recovery.submitCode }),
    );

    await waitFor(async () =>
      expect(
        await canvas.findByRole("heading", { name: AUTH_COPY.recovery.passwordTitle }),
      ).toBeVisible(),
    );
  },
};
