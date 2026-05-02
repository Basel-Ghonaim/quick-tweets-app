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

export const DropzoneDisabled: Story = {
  args: {
    ...Dropzone.args,
    disabled: true,
  },
};

export const DropzoneWithHelper: Story = {
  args: {
    ...Dropzone.args,
    helperText: "Drag files here or click to browse",
    maxSize: 5 * 1024 * 1024,
  },
};

export const DropzoneMultiFile: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents",
    multiple: true,
    helperText: "Drop multiple files — each drop adds to the list",
  },
};

export const DropzoneMaxFiles: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents (max 3)",
    multiple: true,
    maxFiles: 3,
    helperText: "Maximum 3 files allowed",
  },
};

export const DropzoneMinFiles: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents (min 2)",
    multiple: true,
    minFiles: 2,
    helperText: "Minimum 2 files required — cannot delete below 2",
  },
};

export const DropzoneImageGrid: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Images",
    accept: "image/*",
    multiple: true,
    helperText: "Images display as a grid — add, delete, and drag to upload",
  },
};

export const DropzoneImageGridMax5: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Images (max 5)",
    accept: "image/*",
    multiple: true,
    maxFiles: 5,
    helperText: "Maximum 5 images — 'Add more' disappears at limit",
  },
};

export const DropzoneImageGridSuccess: Story = {
  args: {
    ...Dropzone.args,
    label: "Gallery Upload",
    accept: "image/*",
    multiple: true,
    color: "success",
    helperText: "Success color theme for image grid",
  },
};

export const DropzoneFileList: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents",
    multiple: true,
    helperText: "Files show as a list with type icons — add, delete, drag to upload",
  },
};

export const DropzonePdfOnly: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload PDF Files",
    accept: "application/pdf",
    multiple: true,
    helperText: "Only PDF files are accepted",
  },
};

export const DropzonePdfMax5: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload PDF (max 5)",
    accept: "application/pdf",
    multiple: true,
    maxFiles: 5,
    helperText: "Maximum 5 PDF files — 'Add more' disappears at limit",
  },
};

export const DropzoneMixed: Story = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents & Images",
    accept: "image/*,application/pdf,.docx,.xlsx",
    multiple: true,
    helperText: "Mixed types: images + documents — uses file list mode",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR VARIANT
// ═══════════════════════════════════════════════════════════════════════════════

export const AvatarCircle: Story = {
  args: {
    name: "avatar",
    label: "Profile Picture",
    variant: "avatar",
    avatarShape: "circle",
    avatarFill: "default",
    accept: "image/*",
    helperText: "PNG, JPG up to 5MB",
  },
};

export const AvatarCircleOutline: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Profile Picture (Outline)",
    avatarFill: "outline",
  },
};

export const AvatarRectangle: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Cover Image",
    avatarShape: "rectangle",
    avatarFill: "default",
  },
};

export const AvatarRectangleOutline: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Cover Image (Outline)",
    avatarShape: "rectangle",
    avatarFill: "outline",
  },
};

export const AvatarDisabled: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Avatar (Disabled)",
    avatarFill: "outline",
    disabled: true,
  },
};

export const AvatarVideo: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Video Avatar",
    accept: "video/*",
    helperText: "MP4, WebM up to 10MB",
  },
};

export const AvatarWithError: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Avatar (Error)",
    isInvalid: true,
    errorMessage: "Profile picture is required",
  },
};

export const AvatarSuccess: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Avatar (Success Color)",
    color: "success",
    avatarFill: "outline",
  },
};

export const AvatarSolidBorder: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Solid Border",
    avatarBorder: "solid",
    avatarFill: "outline",
    color: "info",
  },
};

export const AvatarNoBorder: Story = {
  args: {
    ...AvatarCircle.args,
    label: "No Border",
    avatarBorder: "none",
    avatarFill: "outline",
  },
};

export const AvatarLarge: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Large Avatar (180px)",
    avatarSize: 180,
    avatarFill: "outline",
  },
};

export const AvatarSmall: Story = {
  args: {
    ...AvatarCircle.args,
    label: "Small Avatar (80px)",
    avatarSize: 80,
    avatarFill: "outline",
  },
};
