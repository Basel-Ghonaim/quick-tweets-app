import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";

const meta = {
  title: "Design System/Forms/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["outlined", "filled", "underlined"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    inputSize: { control: "radio", options: ["small", "medium", "large"] },
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
    inputSize: "medium",
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
    leftIcon: <span>🔍</span>, 
    rightIcon: <span>❌</span> 
  },
};
