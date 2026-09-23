import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { CheckIcon, RefreshIcon, TrashIcon } from "../../../icons";
import { Link } from "../../navigation/Link";
import { ROLES } from "../../../foundations";
import { Toast, ToastRegion } from "./Toast";

const meta = {
  title: "Design System/Feedback/Toast",
  component: Toast,
  parameters: {
    layout: "centered",
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  args: {
    color: "success",
    icon: <CheckIcon />,
    children: "Your post was sent.",
  },
  argTypes: {
    color: { control: "select", options: [...ROLES] },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ItWaitsItsTurn: Story = {
  play: async ({ canvasElement }) => {
    const toast = canvasElement.querySelector('[role="status"]');

    // Polite, never an alert: nothing here needs acting on, and interrupting a
    // reader to report what already happened takes more than it gives.
    await expect(toast).toBeInTheDocument();
    await expect(canvasElement.querySelector('[role="alert"]')).toBeNull();
  },
};

/** The layer colours the glyph by role; the glyph itself came from the caller. */
export const TheRoleColoursTheGlyph: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Toast color="success" icon={<CheckIcon />}>
        Your post was sent.
      </Toast>
      <Toast color="error" icon={<TrashIcon />}>
        That did not go through.
      </Toast>
      <Toast color="warning" icon={<RefreshIcon />}>
        You are doing that too fast.
      </Toast>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const glyphs = [...canvasElement.querySelectorAll<HTMLElement>("span")].filter(
      (span) => span.querySelector("svg"),
    );

    const colours = glyphs.map((glyph) => getComputedStyle(glyph).color);
    await expect(new Set(colours).size).toBe(3);
  },
};

export const WithAnAction: Story = {
  args: {
    action: (
      <Link href="#" placement="standalone" underline="always">
        View
      </Link>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("a")).toHaveAccessibleName("View");
  },
};

export const Dismissible: Story = {
  args: { onDismiss: fn(), dismissLabel: "Dismiss" },
  play: async ({ args, canvasElement }) => {
    const dismiss = canvasElement.querySelector("button")!;

    await expect(dismiss).toHaveAccessibleName("Dismiss");

    await userEvent.click(dismiss);
    // The layer reports the intent; whether the toast goes is the page's.
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

export const TheRegionLetsThePageThrough: Story = {
  render: () => (
    <div style={{ position: "relative", inlineSize: 420, blockSize: 220 }}>
      <button type="button" data-testid="beneath" style={{ inlineSize: "100%" }}>
        Something underneath
      </button>
      <ToastRegion data-testid="region">
        <Toast color="success" icon={<CheckIcon />}>
          Your post was sent.
        </Toast>
      </ToastRegion>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector<HTMLElement>('[data-testid="region"]')!;
    const toast = region.querySelector<HTMLElement>('[role="status"]')!;

    // The band spans the page; only the toast within it receives a pointer.
    await expect(getComputedStyle(region).pointerEvents).toBe("none");
    await expect(getComputedStyle(toast).pointerEvents).toBe("auto");

    const box = region.getBoundingClientRect();
    const beside = document.elementFromPoint(box.left + 8, box.top + box.height / 2);
    await expect(region.contains(beside)).toBe(false);
  },
};
