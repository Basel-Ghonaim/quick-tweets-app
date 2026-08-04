import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import type { ButtonColor, ButtonState, ButtonVariant } from "./Button.types";

const meta = {
  title: "Design System/Actions/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["contained", "outlined", "ghost"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    state: {
      control: "select",
      options: ["idle", "active", "loading", "disabled"],
    },
    size: { control: "radio", options: ["small", "medium", "large"] },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS: ButtonVariant[] = ["contained", "outlined", "ghost"];
const STATES: ButtonState[] = ["idle", "active", "loading", "disabled"];
const COLORS: ButtonColor[] = ["primary", "secondary", "success", "warning", "error", "info"];

// --- Base Default Story
export const Default: Story = {
  args: {
    children: "Button",
    variant: "contained",
    color: "primary",
    state: "idle",
    size: "medium",
  },
};

// --- Variant Matrix
export const Outlined: Story = {
  args: { ...Default.args, variant: "outlined" },
};

export const Ghost: Story = {
  args: { ...Default.args, variant: "ghost" },
};

// --- State Examples
export const Active: Story = {
  args: { ...Default.args, state: "active" },
};

export const Loading: Story = {
  args: { ...Default.args, state: "loading", loadingText: "Submitting..." },
};

export const Disabled: Story = {
  args: { ...Default.args, state: "disabled" },
};

// Every variant in every interaction state — the surface the a11y check and the
// theme switcher exercise. Switch the toolbar theme to see both resolutions.
export const StateMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {STATES.map((state) => (
            <Button key={state} variant={variant} state={state} loadingText="Loading">
              {variant} · {state}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

// Every role, so the on-fill text (contained) and on-surface text (outlined/ghost)
// are exercised across the whole scale in both themes.
export const Roles: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {COLORS.map((color) => (
            <Button key={color} variant={variant} color={color}>
              {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
