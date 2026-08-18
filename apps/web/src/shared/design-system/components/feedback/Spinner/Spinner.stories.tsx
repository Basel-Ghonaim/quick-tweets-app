import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Spinner } from "./Spinner";
import { ROLES } from "../../../foundations";

const meta = {
  title: "Design System/Feedback/Spinner",
  parameters: {
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: [...ROLES] },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The turning is the component's whole purpose, and nothing else here can see
 * it: a screenshot cannot show motion, and an animation that silently stops
 * still renders a plausible-looking ring. This samples the real thing.
 */
export const Rotates: Story = {
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector("span") as HTMLElement;

    const [animation] = el.getAnimations();
    await expect(animation).toBeDefined();
    await expect(animation.playState).toBe("running");

    const before = getComputedStyle(el).transform;
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = getComputedStyle(el).transform;
    await expect(before).not.toBe(after);

    // The arc must differ from the track, or a turning ring looks stationary.
    const { borderBlockStartColor, borderBlockEndColor } = getComputedStyle(el);
    await expect(borderBlockStartColor).not.toBe(borderBlockEndColor);
  },
};

export const Roles: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      {ROLES.map((role) => (
        <Spinner key={role} color={role} />
      ))}
    </div>
  ),
};

/** Without a role it takes the surrounding text colour, so a host needs no prop. */
export const InheritsColour: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <span style={{ color: "var(--text-primary)" }}>
        <Spinner />
      </span>
      <span style={{ color: "var(--text-muted)" }}>
        <Spinner />
      </span>
      <span style={{ color: "var(--role-fill-error)" }}>
        <Spinner />
      </span>
    </div>
  ),
};

/** Sized in `em`, so it tracks the text it sits in rather than a size prop. */
export const TracksFontSize: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <span style={{ font: "var(--type-body-small)" }}>
        <Spinner />
      </span>
      <span style={{ font: "var(--type-body-medium)" }}>
        <Spinner />
      </span>
      <span style={{ font: "var(--type-body-large)" }}>
        <Spinner />
      </span>
    </div>
  ),
};
