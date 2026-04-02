import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

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

// --- Base Default Story
export const Default: Story = {
  args: {
    children: "Button",
    variant: "contained",
    color: "primary",
    state: "active",
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
export const Loading: Story = {
  args: { ...Default.args, state: "loading", loadingText: "Submitting..." },
};

export const Disabled: Story = {
  args: { ...Default.args, state: "disabled" },
};
