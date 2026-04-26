import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileInput } from "./FileInput";

const meta = {
  title: "Design System/Forms/FileInput",
  component: FileInput,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["standard", "dropzone", "avatar"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    isInvalid: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: {
    name: "file-input",
    label: "Upload File",
    variant: "standard",
    color: "primary",
  },
};

export const Dropzone: Story = {
  args: {
    name: "file-input",
    label: "Upload Files",
    variant: "dropzone",
    color: "primary",
  },
};

export const Avatar: Story = {
  args: {
    name: "file-input",
    label: "Profile Image",
    variant: "avatar",
    color: "primary",
  },
};

export const Invalid: Story = {
  args: {
    ...Standard.args,
    isInvalid: true,
    errorMessage: "File is required",
  },
};

export const Disabled: Story = {
  args: {
    ...Standard.args,
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    ...Standard.args,
    fullWidth: true,
  },
};

export const WithMaxSize: Story = {
  args: {
    ...Standard.args,
    label: "Upload (max 2MB)",
    maxSize: 2 * 1024 * 1024,
    helperText: "PNG, JPG up to 2MB",
  },
};

export const WithHelperText: Story = {
  args: {
    ...Standard.args,
    helperText: "Accepted formats: PNG, JPG, PDF",
  },
};

export const ImagesOnly: Story = {
  args: {
    ...Standard.args,
    label: "Upload Image",
    accept: "image/*",
    helperText: "Only image files are accepted",
  },
};
