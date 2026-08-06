import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";
import { CONTROL_SIZES } from "../../../foundations";

const meta = {
  title: "Design System/Fields/Input",
  parameters: {
    // Not promoted here, for the reason recorded on the Pilot Field: the legacy
    // colour bindings still fail contrast. The Work Item that migrates them
    // promotes the gate.
    a11y: { test: "todo" },
  },
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["outlined", "filled", "underlined"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    size: { control: "radio", options: CONTROL_SIZES },
    isInvalid: { control: "boolean" },
    isLoading: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
    variant: "outlined",
    color: "primary",
    size: "medium",
  },
};

export const Filled: Story = {
  args: { ...Default.args, variant: "filled" },
};

export const Underlined: Story = {
  args: { ...Default.args, variant: "underlined" },
};

export const Invalid: Story = {
  args: { ...Default.args, isInvalid: true, defaultValue: "Wrong input" },
};

export const Loading: Story = {
  args: { ...Default.args, isLoading: true, defaultValue: "Validating..." },
};

export const WithIcons: Story = {
  args: { 
    ...Default.args, 
    prefix: <span>🔍</span>,
    suffix: <span>❌</span> 
  },
};
