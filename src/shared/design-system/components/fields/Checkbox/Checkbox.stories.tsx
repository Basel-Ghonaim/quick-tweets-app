import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";
import { CONTROL_SIZES, ROLES } from "../../../foundations";

const meta = {
  title: "Design System/Fields/Checkbox",
  parameters: {
    // Promoted now that the error text binds the semantic role rather than the
    // legacy colour that resolved to 3.6:1; the global default stays reporting
    // until every component has migrated onto the semantic tier.
    a11y: { test: "error" },
  },
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: [...ROLES] },
    size: { control: "radio", options: CONTROL_SIZES },
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
    size: "medium",
  },
};

export const Checked: Story = {
  args: { ...Default.args, defaultChecked: true },
};

export const Small: Story = {
  args: { ...Default.args, size: "small" },
};

export const Large: Story = {
  args: { ...Default.args, size: "large" },
};

export const WithHelperText: Story = {
  args: { ...Default.args, helperText: "You can change this later." },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    errorMessage: "You must accept the terms to continue",
    helperText: "You can change this later.",
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
