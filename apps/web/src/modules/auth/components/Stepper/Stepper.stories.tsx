import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes, Link } from "react-router-dom";
import { ThemeProvider } from "@shared/preferences";
import { Stepper, type JourneyStepId, type StepState } from "./Stepper";
import { JourneyLayout } from "../../layout/JourneyLayout";
import { AUTH_COPY } from "../../config/copy";

/* Storybook mounts no application stylesheet, so a story that does not paint
   the ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <ThemeProvider>
    <div style={{ background: "var(--surface-page)", padding: "2rem" }}>
      <Story />
    </div>
  </ThemeProvider>
);

const meta = {
  title: "Auth/Stepper",
  component: Stepper,
  parameters: { a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

const states = (
  account: StepState,
  profile: StepState,
  verify: StepState,
): Record<JourneyStepId, StepState> => ({ account, profile, verify });

export const AtTheFirstStep: Story = {
  args: { states: states("current", "optional", "optional") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("list", { name: AUTH_COPY.journey.label })).toBeVisible();
    await expect(canvas.getByText(AUTH_COPY.journey.states.current)).toBeVisible();
    await expect(canvas.getAllByText(AUTH_COPY.journey.states.optional)).toHaveLength(2);
  },
};

/** Every state says itself. A reader who cannot tell the colours apart still
 *  learns where they are, which is the whole reason the words are there. */
export const EveryStateSaysItself: Story = {
  args: { states: states("done", "skipped", "current") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const word of [
      AUTH_COPY.journey.states.done,
      AUTH_COPY.journey.states.skipped,
      AUTH_COPY.journey.states.current,
    ]) {
      await expect(canvas.getByText(word)).toBeVisible();
    }
  },
};

/** It reports progress and never navigates, so there is nothing to reach. */
export const NothingHereIsReachable: Story = {
  args: { states: states("done", "current", "optional") },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll("a, button, input, [tabindex]"),
    ).toHaveLength(0);
  },
};

/**
 * The reason the stepper sits in a layout rather than in a screen: the layout's
 * route match does not change as its children do, so the element itself
 * survives the move instead of being replaced.
 */
export const ItSurvivesAMoveBetweenSteps: Story = {
  args: { states: states("current", "optional", "optional") },
  render: () => (
    <MemoryRouter initialEntries={["/auth/signup"]}>
      <Routes>
        <Route path="/auth" element={<JourneyLayout />}>
          <Route path="signup" element={<Link to="/auth/profile">onward</Link>} />
          <Route path="profile" element={<p>profile</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const before = canvas.getByRole("list", { name: AUTH_COPY.journey.label });
    await expect(within(before).getByText(AUTH_COPY.journey.states.current)).toBeVisible();

    await userEvent.click(canvas.getByRole("link", { name: "onward" }));

    // The same element, not an equal one: a remount would replace the node.
    await waitFor(() => expect(canvas.getByText("profile")).toBeVisible());
    await expect(canvas.getByRole("list", { name: AUTH_COPY.journey.label })).toBe(before);

    // And it moved on with the reader.
    await expect(within(before).getByText(AUTH_COPY.journey.states.done)).toBeVisible();
  },
};
