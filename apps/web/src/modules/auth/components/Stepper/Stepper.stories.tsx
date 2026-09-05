import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useState } from "react";
import { ThemeProvider } from "@shared/preferences";
import { Stepper, type JourneyStepId, type StepState } from "./Stepper";
import { JourneyLayout } from "../../layout/JourneyLayout";
import { stepStates, type StepPosition } from "../../journey";
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
 * The journey is one route, so no move can remount the stepper: the element
 * survives a change of step rather than being replaced by an equal one.
 */
export const ItSurvivesAChangeOfStep: Story = {
  args: { states: states("current", "optional", "optional") },
  render: () => {
    const Harness = () => {
      const [at, setAt] = useState<StepPosition>("profile");

      return (
        <JourneyLayout states={stepStates(at, "skipped")}>
          <button type="button" onClick={() => setAt("verify")}>
            onward
          </button>
        </JourneyLayout>
      );
    };

    return <Harness />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const before = canvas.getByRole("list", { name: AUTH_COPY.journey.label });
    await expect(within(before).getByText(AUTH_COPY.journey.states.current)).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "onward" }));

    // The same element, not an equal one: a remount would replace the node.
    await waitFor(() =>
      expect(within(before).getByText(AUTH_COPY.journey.states.skipped)).toBeVisible(),
    );
    await expect(canvas.getByRole("list", { name: AUTH_COPY.journey.label })).toBe(before);
  },
};
