import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "../../controls/Button";
import { THEMES, THEME_ATTRIBUTE } from "../../../foundations";
import { Dialog } from "./Dialog";

const meta = {
  title: "Design System/Overlays/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  args: {
    open: true,
    onClose: () => {},
    title: "Delete post",
    description: "This cannot be undone.",
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened from a control, so what focus does on the way in and out is real. */
const Opened = ({
  variant = "modal" as const,
  withConfirmation = false,
}) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete post"
        description="This cannot be undone."
        variant={variant}
        actions={
          <>
            <Button data-testid="cancel" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button data-testid="confirm" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </>
        }
      />
      {withConfirmation ? (
        <Dialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title="Really delete it?"
          variant="alert"
          actions={<Button data-testid="back">Keep it</Button>}
        />
      ) : null}
    </>
  );
};

export const Modal: Story = {};

export const Alert: Story = {
  args: { variant: "alert", title: "Really delete it?" },
  play: async ({ canvasElement }) => {
    const dialog = canvasElement.querySelector("dialog")!;

    // A question that cannot wait announces itself as one.
    await expect(dialog).toHaveAttribute("role", "alertdialog");
    await expect(dialog).toHaveAccessibleName("Really delete it?");
    await expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  },
};

export const FullScreen: Story = {
  args: { variant: "fullscreen", title: "New post" },
};

export const StackedActions: Story = {
  args: {
    actionsLayout: "stack",
    actions: (
      <>
        <Button>Cancel</Button>
        <Button>Delete</Button>
      </>
    ),
  },
};

export const FocusEntersAndComesBack: Story = {
  render: () => <Opened />,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector("button")!;
    await userEvent.click(trigger);

    const dialog = canvasElement.querySelector("dialog")!;
    await waitFor(() => expect(dialog.open).toBe(true));

    // Focus is inside, or a keyboard reader is left behind the dialog.
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(dialog.open).toBe(false));
    // And back where it started, not stranded at the top of the page.
    await expect(document.activeElement).toBe(trigger);
  },
};

/**
 * Focus being held inside is proven from the outside rather than by walking Tab:
 * a simulated Tab computes its own order and would report the test library's
 * model of the trap instead of the browser's. Nothing behind can take focus, and
 * that is the same guarantee seen from the side this lane can actually observe.
 */
export const APageBehindItCannotTakeFocus: Story = {
  render: () => <Opened />,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector("button")!;
    await userEvent.click(trigger);
    const dialog = canvasElement.querySelector("dialog")!;
    await waitFor(() => expect(dialog.open).toBe(true));
    await expect(dialog.contains(document.activeElement)).toBe(true);

    // Asked for directly, which is more than a reader can do: it still refuses.
    trigger.focus();
    await expect(document.activeElement).not.toBe(trigger);
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

export const AConfirmationSitsAboveIt: Story = {
  render: () => <Opened withConfirmation />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector("button")!);
    const [dialog, confirmation] = [...canvasElement.querySelectorAll("dialog")];
    await waitFor(() => expect(dialog.open).toBe(true));

    await userEvent.click(canvasElement.querySelector('[data-testid="confirm"]')!);
    await waitFor(() => expect(confirmation.open).toBe(true));

    // Both are open, and the question asked last holds focus.
    await expect(dialog.open).toBe(true);
    await expect(confirmation.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(confirmation.open).toBe(false));

    // Focus returns into the dialog beneath, not out to the page.
    await expect(dialog.open).toBe(true);
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

export const TheGroundWashesThePage: Story = {
  play: async ({ canvasElement }) => {
    const dialog = canvasElement.querySelector("dialog")!;
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const seen: string[] = [];

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      const ground = getComputedStyle(dialog, "::backdrop").backgroundColor;
      await expect(ground).not.toBe("rgba(0, 0, 0, 0)");
      seen.push(ground);
    }

    // One token, resolved per theme: a hardcoded ground would read the same twice.
    await expect(new Set(seen).size).toBe(THEMES.length);

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};
