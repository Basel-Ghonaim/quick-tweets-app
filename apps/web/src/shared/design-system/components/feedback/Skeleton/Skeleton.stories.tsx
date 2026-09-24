import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { THEMES, THEME_ATTRIBUTE } from "../../../foundations";
import { Skeleton } from "./Skeleton";
import type { SkeletonShape } from "./Skeleton.types";

const SHAPES: SkeletonShape[] = ["block", "circle", "line"];

const meta = {
  title: "Design System/Feedback/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  argTypes: {
    shape: { control: "select", options: SHAPES },
  },
  args: { shape: "line", style: { inlineSize: 240 } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Circle: Story = { args: { shape: "circle", style: undefined } };

export const Block: Story = {
  args: { shape: "block", style: { inlineSize: 240, blockSize: 120 } },
};

/** A surface knows what it is about to draw, so it says so; a dozen shapes
 *  each reporting the same thing would say it a dozen times. */
export const ItAnnouncesNothing: Story = {
  render: () => (
    <div role="status" aria-label="Loading the feed">
      <Skeleton shape="circle" />
      <Skeleton shape="line" style={{ inlineSize: 200 }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const shapes = [...canvasElement.querySelectorAll("span")];

    // A vacuous pass is the failure here: an empty set announces nothing too.
    await expect(shapes).toHaveLength(2);
    for (const shape of shapes)
      await expect(shape).toHaveAttribute("aria-hidden", "true");

    // The arrangement is what a reader is told, and it is the caller's.
    await expect(canvasElement.querySelector('[role="status"]')).toHaveAccessibleName(
      "Loading the feed",
    );
  },
};

/** A circle that is not square is an ellipse. */
export const TheCircleIsRound: Story = {
  args: { shape: "circle", style: undefined },
  play: async ({ canvasElement }) => {
    const shape = canvasElement.querySelector<HTMLElement>("span")!;
    const { width, height } = shape.getBoundingClientRect();

    await expect(Math.round(width)).toBe(Math.round(height));

    // Fully rounded rather than merely soft: half the box or more reads round.
    const radius = parseFloat(getComputedStyle(shape).borderTopLeftRadius);
    await expect(radius).toBeGreaterThanOrEqual(width / 2);
  },
};

/** The ground is theme-resolved: a literal would read the same in both. */
export const TheGroundResolvesPerTheme: Story = {
  play: async ({ canvasElement }) => {
    const shape = canvasElement.querySelector<HTMLElement>("span")!;
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const seen: string[] = [];

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      const { backgroundColor } = getComputedStyle(shape);
      await expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      seen.push(backgroundColor);
    }

    await expect(new Set(seen).size).toBe(THEMES.length);

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};
