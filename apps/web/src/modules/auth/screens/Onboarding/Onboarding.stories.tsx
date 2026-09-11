import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@shared/preferences";
import { createAppError } from "@shared/errors";
import { Onboarding } from "./Onboarding";
import { AuthLayout } from "../../layout";
import { sessionActions, sessionReducer } from "@shared/session";
import { AUTH_COPY } from "@shared/copy";
import type { JourneyMove, JourneyRepository, JourneyState } from "@features/journey";

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

const never = () => new Promise<never>(() => {});

const withRepo = (repo: JourneyRepository, settled = true) => {
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

export const ThePhaseChoosesTheScreen: Story = {
  render: withRepo({
    read: async () => state({ phase: "profile" }),
    advance: async () => state(),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole("heading", { name: AUTH_COPY.profile.title }),
    ).toBeVisible();
  },
};

/** The read is one request, not one per render — a repository rebuilt each time
 *  would key the effect afresh and never settle. */
export const ThePositionIsAskedForOnce: Story = {
  render: () => {
    const Harness = () => {
      const [reads, setReads] = useState(0);
      const [Mounted] = useState(() =>
        withRepo({
          read: async () => {
            setReads((n) => n + 1);
            return state({ phase: "profile" });
          },
          advance: async () => state(),
        }),
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

    await canvas.findByRole("heading", { name: AUTH_COPY.profile.title });
    await new Promise((resolve) => setTimeout(resolve, 150));

    await expect(canvas.getByTestId("reads")).toHaveTextContent("1");
  },
};

/** Skipping and saving are the same transition to the server, and the outcome
 *  is the only thing that tells them apart. */
export const SkippingSaysItWasSkipped: Story = {
  render: () => {
    const Harness = () => {
      const [moves, setMoves] = useState<JourneyMove[]>([]);
      const [Mounted] = useState(() =>
        withRepo({
          read: async () => state({ phase: "profile" }),
          advance: async (move) => {
            setMoves((seen) => [...seen, move]);
            return state({ phase: "verify", profileOutcome: "skipped" });
          },
        }),
      );

      return (
        <>
          <Mounted />
          <p data-testid="moves">{JSON.stringify(moves)}</p>
        </>
      );
    };

    return <Harness />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("button", { name: AUTH_COPY.profile.skip }));

    await waitFor(() =>
      expect(canvas.getByTestId("moves")).toHaveTextContent('"outcome":"skipped"'),
    );
  },
};

/**
 * The startup restore does not block the first render, so on a reload the token
 * is not in the store yet. Asking then sends a request with no credential, and
 * its refusal says nothing about the journey.
 */
export const TheJourneyWaitsForTheSession: Story = {
  render: () => {
    const Harness = () => {
      const [reads, setReads] = useState(0);
      const [Mounted] = useState(() =>
        withRepo(
          {
            read: async () => {
              setReads((n) => n + 1);
              return state({ phase: "profile" });
            },
            advance: async () => state(),
          },
          false,
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

    await new Promise((resolve) => setTimeout(resolve, 200));

    await expect(canvas.getByTestId("reads")).toHaveTextContent("0");
    await expect(
      canvas.queryByRole("heading", { name: AUTH_COPY.profile.title }),
    ).not.toBeInTheDocument();
  },
};

/** A read that failed is not an answer of none: ejecting a reader whose journey
 *  is open is the one thing this must never do. */
export const AFailedReadOffersARetry: Story = {
  render: withRepo({
    read: async () => {
      throw createAppError("network", "Offline");
    },
    advance: async () => state(),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      AUTH_COPY.onboarding.unavailable,
    );
    await expect(canvas.getByRole("button", { name: AUTH_COPY.onboarding.retry })).toBeVisible();
    await expect(canvas.queryByText("the feed")).not.toBeInTheDocument();
  },
};

/** The feed is public, so leaving must never wait on a request that may never
 *  answer — a dropped network would otherwise trap the reader here. */
export const LeavingNeverWaitsOnTheClose: Story = {
  render: withRepo({
    read: async () => state({ phase: "verify", profileOutcome: "saved" }),
    advance: async (move) => (move.to === "completed" ? never() : state({ phase: "verify" })),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole("link", { name: AUTH_COPY.verify.later }));

    await waitFor(() => expect(canvas.getByText("the feed")).toBeVisible());
  },
};

/** A skipped step reads as skipped, which is the whole reason the server holds
 *  the outcome rather than the client remembering it. */
export const ASkippedProfileReadsAsSkipped: Story = {
  render: withRepo({
    read: async () => state({ phase: "verify", profileOutcome: "skipped" }),
    advance: async () => state({ phase: "verify", profileOutcome: "skipped" }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const profile = (await canvas.findByText(AUTH_COPY.journey.steps.profile)).closest("li");
    await expect(within(profile!).getByText(AUTH_COPY.journey.states.skipped)).toBeVisible();
  },
};
