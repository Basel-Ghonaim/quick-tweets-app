import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";
import { CONTROL_SIZES, ROLES } from "../../../foundations";

const meta = {
  title: "Design System/Fields/Input",
  parameters: {
    // Promoted now that the legacy colour bindings are gone; the global default
    // stays reporting until every component has migrated onto the semantic tier.
    a11y: { test: "error" },
  },
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["outlined", "filled", "underlined"] },
    color: { control: "select", options: [...ROLES] },
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
    label: "Email",
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

export const WithHelperText: Story = {
  args: { ...Default.args, helperText: "We never share your address." },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    defaultValue: "Wrong input",
    errorMessage: "That address is not valid.",
    helperText: "We never share your address.",
  },
};

export const Loading: Story = {
  args: { ...Default.args, isLoading: true, defaultValue: "Validating..." },
};

export const Password: Story = {
  args: { ...Default.args, label: "Password", type: "password" },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true, defaultValue: "Unavailable" },
};

export const WithIcons: Story = {
  args: {
    ...Default.args,
    prefix: <span>🔍</span>,
    suffix: <span>❌</span>,
  },
};

export const Sizes: Story = {
  args: Default.args,
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {CONTROL_SIZES.map((size) => (
        <Input key={size} {...args} size={size} label={size} />
      ))}
    </div>
  ),
};
