import type { Meta, StoryObj } from "@storybook/react-vite";
import { forwardRef, type ComponentProps } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Link } from "./Link";

const meta = {
  title: "Design System/Navigation/Link",
  component: Link,
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
  argTypes: {
    placement: { control: "radio", options: ["in-text", "standalone"] },
    href: { control: "text" },
  },
  args: { href: "/feed", children: "the feed" },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Renders the caller's own element, so a router's link needs no router here. */
const Adapter = forwardRef<
  HTMLAnchorElement,
  ComponentProps<"a"> & { href: string }
>(({ href, ...rest }, ref) => <a ref={ref} href={href} data-adapter="" {...rest} />);

Adapter.displayName = "Adapter";

// --- Base Default Story
export const Default: Story = {};

// --- Variants
export const Standalone: Story = {
  args: { placement: "standalone", children: "Go to the feed" },
};

/**
 * A link in a sentence is not distinguished by colour alone: the accent measures
 * 2.95:1 against body text in light theme, under the 3:1 that would allow it.
 */
export const ADefaultLinkIsUnderlined: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "the feed" });
    const atRest = getComputedStyle(link);

    await expect(atRest.textDecorationLine).toContain("underline");

    // Lighter than the text it sits under, so the reveal has somewhere to go.
    await expect(atRest.textDecorationColor).not.toBe(atRest.color);

    await userEvent.tab();
    await waitFor(() => {
      const revealed = getComputedStyle(link);
      expect(revealed.textDecorationColor).toBe(revealed.color);
    });
  },
};

/**
 * `noopener` is the layer's guarantee; what a caller declares is kept beside it.
 */
export const ANewTabCannotReachItsOpener: Story = {
  render: () => (
    <>
      <Link href="https://example.com" target="_blank">
        blank
      </Link>
      <Link href="https://example.com" target="report" rel="nofollow">
        named
      </Link>
      <Link href="/feed" target="_self">
        self
      </Link>
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const blank = canvas.getByRole("link", { name: "blank" });
    await expect(blank).toHaveAttribute("rel", "noopener");

    // A named target opens a new context too, and the caller's rel survives it.
    const named = canvas.getByRole("link", { name: "named" });
    await expect(named).toHaveAttribute("rel", "nofollow noopener");

    // Reusing the current context exposes no opener, so nothing is forced.
    const self = canvas.getByRole("link", { name: "self" });
    await expect(self).not.toHaveAttribute("rel");
  },
};

/** Only a link inside a sentence is exempt from the target floor. */
export const AStandaloneLinkMeetsTheTargetFloor: Story = {
  args: { placement: "standalone", children: "Go" },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "Go" });

    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  },
};

/** The layer's first inline focusable element, in the case only it produces. */
export const AWrappedLinkKeepsItsFocusRing: Story = {
  args: { children: "a destination whose name runs past the end of the line" },
  render: (args) => (
    <p style={{ inlineSize: "10rem" }}>
      Text before <Link {...args} /> and text after.
    </p>
  ),
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", {
      name: /past the end of the line/,
    });

    // It really is fragmented: the ring is drawn per line box, not around one.
    await expect(link.getClientRects().length).toBeGreaterThan(1);

    await userEvent.tab();
    await expect(link).toHaveFocus();

    // The offset, not the presence: a focused anchor gets the browser's own
    // outline at 0px, so only the owned ring's 2px tells them apart.
    await expect(getComputedStyle(link).outlineOffset).toBe("2px");
  },
};

/** The boundary itself: the layer renders whatever the caller hands it. */
export const ACallerSuppliesTheNavigatingElement: Story = {
  args: { as: Adapter },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "the feed" });

    await expect(link).toHaveAttribute("data-adapter");
    await expect(link).toHaveAttribute("href", "/feed");
  },
};

/**
 * The underline arrives rather than appears. `userEvent.hover` does not set the
 * browser's own `:hover`, so focus stands in: it carries the same reveal rule.
 */
export const AStandaloneLinkRevealsItsUnderline: Story = {
  args: { placement: "standalone", children: "Go to the feed" },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", {
      name: "Go to the feed",
    });
    const atRest = getComputedStyle(link);

    await expect(atRest.textDecorationColor).toBe("rgba(0, 0, 0, 0)");

    // Reserved, not absent -- so what follows is a transition and not a jump.
    await expect(atRest.transitionProperty).toContain("text-decoration-color");

    await userEvent.tab();
    await expect(link).toHaveFocus();

    // Awaited, because the value is still transparent on the first frame -- which
    // is the transition doing its work rather than the rule failing to apply.
    await waitFor(() => {
      const revealed = getComputedStyle(link);
      expect(revealed.textDecorationColor).toBe(revealed.color);
    });
  },
};

