import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";
import { CONTROL_SIZES } from "../../../foundations";

const meta = {
  title: "Design System/Fields/Checkbox",
  parameters: {
    // Not promoted here. Doing so fails on a pre-existing contrast defect: the
    // error text still binds the legacy error colour, which resolves to 3.6:1
    // against the page. The vocabulary that passes already exists; binding it is
    // token work, so the gate is promoted by the Work Item that migrates it.
    a11y: { test: "todo" },
  },
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
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
