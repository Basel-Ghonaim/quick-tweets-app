import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ToggleButton } from "./ToggleButton";
import { Button } from "../Button";
import { EyeIcon } from "../../../icons";

/**
 * The props are a discriminated union, which a spread collapses — so the stories
 * below write them out. A consumer writes them out too; only Storybook's `args`
 * arrive as one object.
 */
const meta = {
  title: "Design System/Controls/ToggleButton",
  component: ToggleButton,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
  args: {
    pressed: false,
    onPressedChange: () => {},
    children: "Bold",
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = ["ghost", "outlined", "contained"] as const;
const noop = () => {};

// --- Base Default Story
export const Default: Story = {};

export const Pressed: Story = { args: { pressed: true } };

/** Every variant in both states, which is where the treatments are compared. */
export const Variants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: "0.5rem" }}>
          <ToggleButton variant={variant} pressed={false} onPressedChange={noop}>
            {variant}
          </ToggleButton>
          <ToggleButton variant={variant} pressed onPressedChange={noop}>
            {variant} pressed
          </ToggleButton>
        </div>
      ))}
    </div>
  ),
};

/**
 * Pressed is not a colour of its own: it is the filled treatment, so a pressed
 * ghost toggle paints exactly what a contained button paints.
 */
export const PressedIsTheFilledTreatment: Story = {
  render: () => (
    <div>
      <ToggleButton variant="ghost" pressed={false} onPressedChange={noop}>
        resting
      </ToggleButton>
      <ToggleButton variant="ghost" pressed onPressedChange={noop}>
        pressed
      </ToggleButton>
      <Button variant="contained">reference</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const at = (name: string) =>
      getComputedStyle(canvas.getByRole("button", { name }));

    await expect(at("pressed").backgroundColor).toBe(
      at("reference").backgroundColor,
    );
    await expect(at("pressed").backgroundColor).not.toBe(
      at("resting").backgroundColor,
    );
  },
};

/** The boundary is what separates a pressed contained toggle from a resting one. */
export const PressedDrawsItsBoundary: Story = {
  render: () => (
    <div>
      <ToggleButton variant="contained" pressed={false} onPressedChange={noop}>
        resting
      </ToggleButton>
      <ToggleButton variant="contained" pressed onPressedChange={noop}>
        pressed
      </ToggleButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const at = (name: string) =>
      getComputedStyle(canvas.getByRole("button", { name }));

    await expect(at("resting").boxShadow).toBe("none");
    await expect(at("pressed").boxShadow).not.toBe("none");
  },
};

/** Controlled, always: pressing asks, and the answer comes from above. */
export const PressingReportsUpward: Story = {
  render: function Render() {
    const [pressed, setPressed] = useState(false);
    return (
      <ToggleButton pressed={pressed} onPressedChange={setPressed}>
        Bold
      </ToggleButton>
    );
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Bold" });

    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
  },
};

/** And it holds nothing of its own: a caller who ignores the report sees no change. */
export const AToggleNeverHoldsItsOwnState: Story = {
  render: () => (
    <ToggleButton pressed={false} onPressedChange={noop}>
      Bold
    </ToggleButton>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Bold" });

    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "false");
  },
};

/** The same control with the other anatomy, where the name is required. */
export const AnIconToggle: Story = {
  render: function Render() {
    const [pressed, setPressed] = useState(false);
    return (
      <ToggleButton
        icon={<EyeIcon />}
        aria-label="Reveal"
        pressed={pressed}
        onPressedChange={setPressed}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Reveal" });

    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
  },
};
