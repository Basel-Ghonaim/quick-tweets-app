import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Design System/Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    checkboxSize: { control: "radio", options: ["small", "medium", "large"] },
    isInvalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "I agree to the Terms of Service",
    color: "primary",
    checkboxSize: "medium",
  },
};

export const Checked: Story = {
  args: { ...Default.args, defaultChecked: true },
};

export const Small: Story = {
  args: { ...Default.args, checkboxSize: "small" },
};

export const Large: Story = {
  args: { ...Default.args, checkboxSize: "large" },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: "You must accept the terms to continue",
  },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};

export const DisabledChecked: Story = {
  args: { ...Default.args, disabled: true, defaultChecked: true },
};

export const SuccessColor: Story = {
  args: { ...Default.args, color: "success", defaultChecked: true },
};
