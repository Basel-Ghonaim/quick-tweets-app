import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { IconButton } from "../../controls/IconButton";
import { PencilIcon, TrashIcon, UserIcon } from "../../../icons";
import { Menu } from "./Menu";
import { MenuItem } from "./MenuItem";

const meta = {
  title: "Design System/Overlays/Menu",
  component: Menu,
  parameters: {
    layout: "centered",
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  args: {
    label: "Post options",
    trigger: <IconButton icon={<UserIcon />} aria-label="Open post options" />,
    children: (
      <>
        <MenuItem icon={<PencilIcon />}>Edit post</MenuItem>
        <MenuItem icon={<UserIcon />} checked>
          Dark mode
        </MenuItem>
        <MenuItem icon={<TrashIcon />} color="error">
          Delete post
        </MenuItem>
      </>
    ),
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

const openMenu = async (canvasElement: HTMLElement) => {
  await userEvent.click(canvasElement.querySelector("button")!);
  const surface = document.querySelector<HTMLElement>('[role="menu"]')!;
  await waitFor(() => expect(surface.matches(":popover-open")).toBe(true));
  return surface;
};

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector("button")!;

    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(
      document.querySelector('[role="menu"]')!.matches(":popover-open"),
    ).toBe(false);
  },
};

export const Opens: Story = {
  play: async ({ canvasElement }) => {
    const surface = await openMenu(canvasElement);
    const trigger = canvasElement.querySelector("button")!;

    // The disclosure state is wired by the component, so a caller cannot let the
    // two fall out of step.
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(surface).toHaveAccessibleName("Post options");

    // Focus enters the surface, or the keyboard has nowhere to start.
    await expect(document.activeElement).toBe(
      surface.querySelector('[role="menuitem"]'),
    );
  },
};

export const ItemsAnnounceWhatTheyAre: Story = {
  play: async ({ canvasElement }) => {
    const surface = await openMenu(canvasElement);

    const commands = surface.querySelectorAll('[role="menuitem"]');
    const choice = surface.querySelector('[role="menuitemcheckbox"]')!;

    // A command reports no state; a choice reports one. Two of three, and one.
    await expect(commands).toHaveLength(2);
    await expect(choice).toHaveAttribute("aria-checked", "true");

    // Danger is presentation. It announces nothing of its own.
    const dangerous = commands[1];
    await expect(dangerous).not.toHaveAttribute("aria-disabled");
    await expect(getComputedStyle(dangerous).color).not.toBe(
      getComputedStyle(commands[0]).color,
    );
  },
};

export const TheKeyboardWalksTheRing: Story = {
  play: async ({ canvasElement }) => {
    const surface = await openMenu(canvasElement);
    const items = [...surface.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]')];

    await userEvent.keyboard("{ArrowDown}");
    await expect(document.activeElement).toBe(items[1]);

    await userEvent.keyboard("{End}");
    await expect(document.activeElement).toBe(items[items.length - 1]);

    // Wraps rather than stranding a reader at the end.
    await userEvent.keyboard("{ArrowDown}");
    await expect(document.activeElement).toBe(items[0]);

    await userEvent.keyboard("{ArrowUp}");
    await expect(document.activeElement).toBe(items[items.length - 1]);

    await userEvent.keyboard("{Home}");
    await expect(document.activeElement).toBe(items[0]);
  },
};

export const EscapeClosesAndGivesFocusBack: Story = {
  play: async ({ canvasElement }) => {
    const surface = await openMenu(canvasElement);
    const trigger = canvasElement.querySelector("button")!;

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(surface.matches(":popover-open")).toBe(false));
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Losing focus to the body would strand a keyboard reader at the top of the page.
    await expect(document.activeElement).toBe(trigger);
  },
};

export const SitsAgainstItsTrigger: Story = {
  play: async ({ canvasElement }) => {
    const surface = await openMenu(canvasElement);
    const trigger = canvasElement.querySelector("button")!;

    const menuBox = surface.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();

    // Below it, and clear of it: measured rather than declared, so it reads the
    // same whichever edge the reader starts from.
    await expect(menuBox.top).toBeGreaterThanOrEqual(triggerBox.bottom);
    await expect(menuBox.top - triggerBox.bottom).toBeLessThan(24);

    // On screen on the inline axis, which is what shifting exists to guarantee.
    await expect(menuBox.left).toBeGreaterThanOrEqual(0);
    await expect(menuBox.right).toBeLessThanOrEqual(window.innerWidth);
  },
};
