import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
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

/** Which of two boxes comes first in the page's reading direction. */
const comesFirst = (a: Element, b: Element) => {
  const [first, second] = [a.getBoundingClientRect(), b.getBoundingClientRect()];
  return getComputedStyle(document.documentElement).direction === "rtl"
    ? first.right > second.right
    : first.left < second.left;
};

/** What a text style resolves to here, read from the token rather than restated. */
const fontOf = (host: Element, token: string) => {
  const probe = document.createElement("span");
  probe.style.font = `var(${token})`;
  host.append(probe);
  const font = getComputedStyle(probe).font;
  probe.remove();
  return font;
};

const targetFloor = () =>
  parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--control-target-min",
    ),
  );

/** Opened from a control, so what focus does on the way in and out is real. */
const Opened = ({
  withConfirmation = false,
  onDismissed,
}: {
  withConfirmation?: boolean;
  onDismissed?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dialog = {
    open,
    onClose: () => setOpen(false),
    title: "Delete post",
    description: "This cannot be undone.",
    actions: (
      <>
        <Button data-testid="cancel" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button data-testid="confirm" onClick={() => setConfirming(true)}>
          Delete
        </Button>
      </>
    ),
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      {onDismissed ? (
        <Dialog
          {...dialog}
          dismissLabel="Close"
          // The page decides to let it go; the layer only asked.
          onDismiss={() => {
            onDismissed();
            setOpen(false);
          }}
        />
      ) : (
        <Dialog {...dialog} />
      )}
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

/** A page of work on a desktop: a bar with the way out leading, and no row of actions. */
export const Task: Story = {
  args: {
    variant: "task",
    title: "New post",
    description: undefined,
    dismissLabel: "Close",
    onDismiss: fn(),
    children: <p>What is new?</p>,
  },
  play: async ({ canvasElement }) => {
    const dialog = canvasElement.querySelector("dialog")!;
    const title = dialog.querySelector("h2")!;
    const dismiss = dialog.querySelector("button")!;
    const bar = title.parentElement!;

    await expect(dialog).toHaveAccessibleName("New post");
    await expect(dismiss).toHaveAccessibleName("Close");

    // A bar leads with its way out, where a card ends with it.
    await expect(comesFirst(dismiss, title)).toBe(true);
    await expect(getComputedStyle(title).font).toBe(
      fontOf(dialog, "--type-heading-medium"),
    );

    await expect(getComputedStyle(dialog).paddingBlockStart).toBe("0px");
    await expect(
      parseFloat(getComputedStyle(bar).borderBlockEndWidth),
    ).toBeGreaterThan(0);
  },
};

/** Each form's width is its own; none of them is the caller's to choose. */
export const EachFormTakesItsWidth: Story = {
  render: () => (
    <>
      <Dialog open onClose={() => {}} title="Reply" />
      <Dialog open onClose={() => {}} title="Delete post?" variant="alert" />
      <Dialog open onClose={() => {}} title="New post" variant="task" />
      <Dialog open onClose={() => {}} title="New post" variant="fullscreen" />
    </>
  ),
  play: async ({ canvasElement }) => {
    const widths = [...canvasElement.querySelectorAll("dialog")].map(
      (dialog) => dialog.getBoundingClientRect().width,
    );

    await expect(widths).toEqual([560, 400, 600, window.innerWidth]);
  },
};

/** The phone's form: its head is a bar holding the way out, the title and one action. */
export const FullScreenWithItsBar: Story = {
  args: {
    variant: "fullscreen",
    title: "New post",
    description: undefined,
    dismissLabel: "Cancel",
    onDismiss: fn(),
    action: <Button>Post</Button>,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = canvasElement.querySelector("dialog")!;
    const title = dialog.querySelector("h2")!;
    const [cancel, post] = [...dialog.querySelectorAll("button")];
    const bar = title.parentElement!;

    await expect(dialog).toHaveAccessibleName("New post");
    await expect(cancel).toHaveTextContent("Cancel");
    await expect(post).toHaveAccessibleName("Post");

    // The way out leads and the action closes the line, in the page's direction.
    await expect(comesFirst(cancel, title)).toBe(true);
    await expect(comesFirst(title, post)).toBe(true);

    await expect(getComputedStyle(title).textAlign).toBe("center");
    await expect(getComputedStyle(title).font).toBe(
      fontOf(dialog, "--type-heading-small"),
    );

    // Edge to edge and ruled off: the frame gives the bar no inset of its own.
    await expect(bar.getBoundingClientRect().width).toBe(
      dialog.getBoundingClientRect().width,
    );
    await expect(getComputedStyle(dialog).paddingBlockStart).toBe("0px");
    await expect(
      parseFloat(getComputedStyle(bar).borderBlockEndWidth),
    ).toBeGreaterThan(0);

    await userEvent.click(cancel);
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
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

/** The reply dialog's head: the title, then the control that asks to leave it. */
export const WithADismissal: Story = {
  args: { dismissLabel: "Close", onDismiss: fn() },
  play: async ({ canvasElement }) => {
    const dialog = canvasElement.querySelector("dialog")!;
    const title = dialog.querySelector("h2")!;
    const dismiss = dialog.querySelector<HTMLButtonElement>("h2 ~ button")!;

    // Named by the caller's word, or it is a glyph nobody can ask for.
    await expect(dismiss).toHaveAccessibleName("Close");

    // A card's head closes at its end, whichever way the page reads.
    await expect(comesFirst(title, dismiss)).toBe(true);

    const box = dismiss.getBoundingClientRect();
    await expect(box.width).toBeGreaterThanOrEqual(targetFloor());
    await expect(box.height).toBeGreaterThanOrEqual(targetFloor());

    dismiss.focus();
    await expect(document.activeElement).toBe(dismiss);
  },
};

export const TheDismissalAsksThePage: Story = {
  args: { onDismiss: fn(), dismissLabel: "Close" },
  render: (args) => <Opened onDismissed={args.onDismiss} />,
  play: async ({ args, canvasElement }) => {
    const trigger = canvasElement.querySelector("button")!;
    await userEvent.click(trigger);
    const dialog = canvasElement.querySelector("dialog")!;
    await waitFor(() => expect(dialog.open).toBe(true));

    await userEvent.click(dialog.querySelector("h2 ~ button")!);

    // Reported once; the page answered by closing it.
    await expect(args.onDismiss).toHaveBeenCalledOnce();
    await waitFor(() => expect(dialog.open).toBe(false));
    await expect(document.activeElement).toBe(trigger);
  },
};

export const FocusComesBackAfterAnAction: Story = {
  render: () => <Opened />,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector("button")!;
    await userEvent.click(trigger);
    const dialog = canvasElement.querySelector("dialog")!;
    await waitFor(() => expect(dialog.open).toBe(true));

    await userEvent.click(canvasElement.querySelector('[data-testid="cancel"]')!);

    await waitFor(() => expect(dialog.open).toBe(false));
    await expect(document.activeElement).toBe(trigger);
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
