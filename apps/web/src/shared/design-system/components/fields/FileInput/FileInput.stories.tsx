import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { THEMES, THEME_ATTRIBUTE } from "../../../foundations";
import { FileInput } from "./FileInput";
import type { FileInputProps } from "./FileInput.types";

const meta = {
  title: "Design System/Fields/FileInput",
  parameters: {
    // Not promoted: the disabled state's opacity mutes text below AA.
    a11y: { test: "todo" },
  },
  component: FileInput,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["standard", "dropzone", "avatar"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    avatarShape: { control: "select", options: ["circle", "rectangle"] },
    avatarFill: { control: "select", options: ["default", "outline"] },
    avatarBorder: { control: "select", options: ["dashed", "solid", "none"] },
    avatarSize: { control: { type: "number", min: 40, max: 300, step: 10 } },
    isInvalid: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// The props a variant owns are only valid with that variant, so a story states
// which one it exercises. Typing them all against the union would collapse the
// variant-specific args to `never` — the union refusing what it is meant to.
type DropzoneStory = StoryObj<Extract<FileInputProps, { variant: "dropzone" }>>;
type AvatarStory = StoryObj<Extract<FileInputProps, { variant: "avatar" }>>;

// The surface a variant renders is picking-related markup around one native
// control, and both variants make the same three promises about it. Asserted
// against the element the control sits in, found through the control itself,
// so the assertions do not depend on a generated class name.
const surfaceHoldingOneControl =
  (label: string) =>
  async ({
    canvasElement,
    step,
  }: {
    canvasElement: HTMLElement;
    step: (name: string, run: () => Promise<void>) => void | Promise<void>;
  }) => {
    const input = within(canvasElement).getByLabelText(label);
    const surface = input.parentElement as HTMLElement;

    await step("offers one tab stop, and it is the control", async () => {
      await userEvent.tab();
      await expect(input).toHaveFocus();
      await userEvent.tab();
      await expect(surface.contains(document.activeElement)).toBe(false);
    });

    await step("indicates the focus its control receives", async () => {
      await expect(getComputedStyle(surface).outlineStyle).toBe("none");
      await userEvent.tab();
      await expect(input).toHaveFocus();
      await expect(getComputedStyle(surface).outlineStyle).toBe("solid");
    });

    await step("still answers a drag", async () => {
      const resting = surface.className;
      fireEvent.dragEnter(surface);
      fireEvent.dragOver(surface);
      await expect(surface.className).not.toBe(resting);
      fireEvent.dragLeave(surface);
      await expect(surface.className).toBe(resting);
    });
  };

export const Standard: Story = {
  args: {
    name: "file-input",
    label: "Upload File",
    variant: "standard",
    color: "primary",
  },
};

export const Dropzone: DropzoneStory = {
  args: {
    name: "file-input",
    label: "Upload Files",
    variant: "dropzone",
    color: "primary",
  },
  play: surfaceHoldingOneControl("Upload Files"),
};

export const Avatar: AvatarStory = {
  args: {
    name: "file-input",
    label: "Profile Image",
    variant: "avatar",
    color: "primary",
  },
  play: surfaceHoldingOneControl("Profile Image"),
};

// One per variant: the role reaches all three through the shell, and two of them
// used to ignore it entirely.
export const StandardRoleColour: Story = {
  args: { ...Standard.args, color: "success" },
};

export const DropzoneRoleColour: DropzoneStory = {
  args: { ...Dropzone.args, color: "success" },
};

export const AvatarRoleColour: AvatarStory = {
  args: { ...Avatar.args, color: "success" },
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

export const DropzoneDisabled: DropzoneStory = {
  args: {
    ...Dropzone.args,
    disabled: true,
  },
};

export const DropzoneWithHelper: DropzoneStory = {
  args: {
    ...Dropzone.args,
    helperText: "Drag files here or click to browse",
    maxSize: 5 * 1024 * 1024,
  },
};

export const DropzoneMultiFile: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents",
    multiple: true,
    helperText: "Drop multiple files — each drop adds to the list",
  },
};

export const DropzoneMaxFiles: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents (max 3)",
    multiple: true,
    maxFiles: 3,
    helperText: "Maximum 3 files allowed",
  },
};

export const DropzoneMinFiles: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents (min 2)",
    multiple: true,
    minFiles: 2,
    helperText: "Minimum 2 files required — cannot delete below 2",
  },
};

export const DropzoneImageGrid: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload Images",
    accept: "image/*",
    multiple: true,
    helperText: "Images display as a grid — add, delete, and drag to upload",
  },
};

export const DropzoneImageGridMax5: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload Images (max 5)",
    accept: "image/*",
    multiple: true,
    maxFiles: 5,
    helperText: "Maximum 5 images — 'Add more' disappears at limit",
  },
};

export const DropzoneImageGridSuccess: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Gallery Upload",
    accept: "image/*",
    multiple: true,
    color: "success",
    helperText: "Success color theme for image grid",
  },
};

export const DropzoneFileList: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload Documents",
    multiple: true,
    helperText: "Files show as a list with type icons — add, delete, drag to upload",
  },
};

export const DropzonePdfOnly: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload PDF Files",
    accept: "application/pdf",
    multiple: true,
    helperText: "Only PDF files are accepted",
  },
};

export const DropzonePdfMax5: DropzoneStory = {
  args: {
    ...Dropzone.args,
    label: "Upload PDF (max 5)",
    accept: "application/pdf",
    multiple: true,
    maxFiles: 5,
    helperText: "Maximum 5 PDF files — 'Add more' disappears at limit",
  },
};

export const DropzoneMixed: DropzoneStory = {
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

export const AvatarCircle: AvatarStory = {
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

export const AvatarCircleOutline: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Profile Picture (Outline)",
    avatarFill: "outline",
  },
};

export const AvatarRectangle: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Cover Image",
    avatarShape: "rectangle",
    avatarFill: "default",
  },
};

export const AvatarRectangleOutline: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Cover Image (Outline)",
    avatarShape: "rectangle",
    avatarFill: "outline",
  },
};

export const AvatarDisabled: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Avatar (Disabled)",
    avatarFill: "outline",
    disabled: true,
  },
};

export const AvatarVideo: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Video Avatar",
    accept: "video/*",
    helperText: "MP4, WebM up to 10MB",
  },
};

export const AvatarWithError: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Avatar (Error)",
    isInvalid: true,
    errorMessage: "Profile picture is required",
  },
};

export const AvatarSuccess: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Avatar (Success Color)",
    color: "success",
    avatarFill: "outline",
  },
};

export const AvatarSolidBorder: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Solid Border",
    avatarBorder: "solid",
    avatarFill: "outline",
    color: "info",
  },
};

export const AvatarNoBorder: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "No Border",
    avatarBorder: "none",
    avatarFill: "outline",
  },
};

export const AvatarLarge: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Large Avatar (180px)",
    avatarSize: 180,
    avatarFill: "outline",
  },
};

export const AvatarSmall: AvatarStory = {
  args: {
    ...AvatarCircle.args,
    label: "Small Avatar (80px)",
    avatarSize: 80,
    avatarFill: "outline",
  },
};

/**
 * The row's remove control is the shared IconButton now. It reaches the minimum
 * hit target, which at 22px it did not, and it carries the owned focus
 * indicator, which it did not carry at all.
 *
 * A file has to be selected for the row to exist, so the story drives that
 * rather than asserting against a surface no story renders.
 */
export const FileListRemoveMeetsTheTarget: DropzoneStory = {
  args: { ...DropzoneFileList.args },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>(
      'input[type="file"]',
    )!;

    // Assigned rather than clicked: the native input is deliberately
    // `pointer-events: none`, so a pointer-driven upload cannot reach it.
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(["report"], "report.pdf", { type: "application/pdf" }),
    );
    input.files = transfer.files;
    fireEvent.change(input);

    const remove = await canvas.findByRole("button", { name: /^Remove/ });

    const { width, height } = remove.getBoundingClientRect();
    await expect(width).toBeGreaterThanOrEqual(24);
    await expect(height).toBeGreaterThanOrEqual(24);

    // Composed, not declared — the defect this migration exists to close.
    await expect(remove.className).toMatch(/_focusRing_/);
  },
};

/** Selects one file and returns the element, so a story can reach a surface that only exists after an upload. */
const uploadOneFile = async (
  canvasElement: HTMLElement,
  file: File,
): Promise<void> => {
  const input = canvasElement.querySelector<HTMLInputElement>(
    'input[type="file"]',
  )!;
  // Assigned rather than clicked: the native input is deliberately
  // `pointer-events: none`, so a pointer-driven upload cannot reach it.
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  fireEvent.change(input);
};

const png = () =>
  new File([new Uint8Array([137, 80, 78, 71])], "photo.png", {
    type: "image/png",
  });

/**
 * Guards the invariant Finding 0014 records: the overlay holds the only means
 * of replacing or deleting the file, so its controls have to be visible
 * whenever they can be reached.
 */
export const AvatarOverlayRevealsOnKeyboardFocus: AvatarStory = {
  args: { ...Avatar.args },
  play: async ({ canvasElement }) => {
    await uploadOneFile(canvasElement, png());

    const canvas = within(canvasElement);
    const remove = await canvas.findByRole("button", { name: /Delete file/i });
    // Anchored on the trailing underscore: without it this matches the inner
    // `avatarOverlayActions` wrapper, which is never the transparent one.
    const overlay = remove.closest<HTMLElement>("[class*='avatarOverlay_']")!;

    await expect(getComputedStyle(overlay).opacity).toBe("0");

    remove.focus();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(getComputedStyle(overlay).opacity).toBe("1");
  },
};

/** The same defect on the image grid: the remove control is the transparent one. */
export const ThumbnailRemoveRevealsOnKeyboardFocus: DropzoneStory = {
  args: { ...DropzoneImageGrid.args },
  play: async ({ canvasElement }) => {
    await uploadOneFile(canvasElement, png());

    const canvas = within(canvasElement);
    const remove = await canvas.findByRole("button", { name: /^Remove/ });

    await expect(getComputedStyle(remove).opacity).toBe("0");

    remove.focus();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(getComputedStyle(remove).opacity).toBe("1");
  },
};

/**
 * Two things hold at once for these controls: the contract they take from the
 * layer, and the wash that answers the photograph behind them, which is this
 * field's and not the system's.
 */
export const AvatarOverlayControlsMeetTheContract: AvatarStory = {
  args: { ...Avatar.args },
  play: async ({ canvasElement }) => {
    await uploadOneFile(canvasElement, png());

    const canvas = within(canvasElement);
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

      for (const name of [/Delete file/i, /Replace file/i]) {
        const control = await canvas.findByRole("button", { name });

        const { width, height } = control.getBoundingClientRect();
        await expect(width).toBeGreaterThanOrEqual(24);
        await expect(height).toBeGreaterThanOrEqual(24);

        await expect(control.className).toMatch(/_focusRing_/);

        // Asserted in both themes because it answers the photograph behind it,
        // which no theme governs.
        const { backgroundColor, boxShadow } = getComputedStyle(control);
        await expect(backgroundColor).toBe("rgba(255, 255, 255, 0.9)");
        await expect(boxShadow).toContain("rgba(0, 0, 0, 0.18)");
      }
    }

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

/**
 * The remove control was 20px against a 24px floor. The increase is an
 * intentional visual change, not preservation — so the thing worth asserting is
 * that it still sits inside the thumbnail it is pinned to, which is what a 20%
 * larger box puts at risk.
 */
export const ThumbnailRemoveMeetsTheContract: DropzoneStory = {
  args: { ...DropzoneImageGrid.args },
  play: async ({ canvasElement }) => {
    await uploadOneFile(canvasElement, png());

    const canvas = within(canvasElement);
    const remove = await canvas.findByRole("button", { name: /^Remove/ });
    const thumbnail = remove.parentElement as HTMLElement;

    const box = remove.getBoundingClientRect();
    await expect(box.width).toBeGreaterThanOrEqual(24);
    await expect(box.height).toBeGreaterThanOrEqual(24);

    await expect(remove.className).toMatch(/_focusRing_/);

    const { backgroundColor, boxShadow } = getComputedStyle(remove);
    await expect(backgroundColor).toBe("rgba(0, 0, 0, 0.6)");
    await expect(boxShadow).toContain("rgba(255, 255, 255, 0.9)");

    // Layout: still wholly inside the thumbnail, which is what the increase
    // could have broken — it is pinned 4px from a corner of an 80px box.
    const frame = thumbnail.getBoundingClientRect();
    await expect(box.right).toBeLessThanOrEqual(frame.right);
    await expect(box.top).toBeGreaterThanOrEqual(frame.top);
    await expect(box.bottom).toBeLessThanOrEqual(frame.bottom);
  },
};
