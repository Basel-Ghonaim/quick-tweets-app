import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button.types";
import { CONTROL_SIZES, ROLES } from "../../foundations";

const meta = {
  title: "Design System/Actions/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    // a11y is promoted to failing for this migrated component; the global default
    // stays reporting until every component has migrated onto the semantic tier.
    a11y: { test: "error" },
  },
  argTypes: {
    variant: { control: "select", options: ["contained", "outlined", "ghost"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    size: { control: "radio", options: CONTROL_SIZES },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS: ButtonVariant[] = ["contained", "outlined", "ghost"];
// Availability is two independent flags, so the matrix enumerates their
// combinations rather than the positions of a single enum.
const AVAILABILITY = [
  { label: "idle", props: {} },
  { label: "loading", props: { isLoading: true } },
  { label: "disabled", props: { disabled: true } },
] as const;

// --- Base Default Story
export const Default: Story = {
  args: {
    children: "Button",
    variant: "contained",
    color: "primary",
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

// --- Availability
export const Loading: Story = {
  args: { ...Default.args, isLoading: true, loadingText: "Submitting..." },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};

// Every variant in every availability combination — the surface the a11y check
// and the theme switcher exercise. Switch the toolbar theme to see both
// resolutions.
export const StateMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {AVAILABILITY.map(({ label, props }) => (
            <Button key={label} variant={variant} loadingText="Loading" {...props}>
              {variant} · {label}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

// Every size, so WI-4A's per-size intents render — the control-spacing padding
// (--control-padding-*) and the composite text styles (--type-control-label-*).
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {CONTROL_SIZES.map((size) => (
        <Button key={size} size={size}>
          {size}
        </Button>
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
          {ROLES.map((color) => (
            <Button key={color} variant={variant} color={color}>
              {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
