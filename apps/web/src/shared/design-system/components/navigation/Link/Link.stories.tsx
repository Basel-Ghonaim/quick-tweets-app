import type { Meta, StoryObj } from "@storybook/react-vite";
import { forwardRef, type ComponentProps } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Link } from "./Link";
import { Typography } from "../../display/Typography";
import type { LinkUnderline } from "./Link.types";

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

const UNDERLINES: LinkUnderline[] = ["none", "always", "hover", "subtle"];

/** Contrast from *rendered* colour. `tokenContrast` reads the stylesheets; this
 *  reads what the cascade actually produced, which is a different instrument. */
const luminance = (rgb: string) => {
  const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

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

/** Every style, in the placement where the choice is hardest to get right. */
export const UnderlineStyles: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {UNDERLINES.map((underline) => (
        <p key={underline}>
          Body text with <Link {...args} underline={underline} /> inside it.
        </p>
      ))}
    </div>
  ),
};

/**
 * Storybook paints no page ground, so this story paints it: a light accent
 * judged against the browser's white is judged against the wrong colour.
 */
export const TheAccentClearsBothTheTextAndTheGround: Story = {
  args: { underline: "none" },
  render: (args) => (
    <div
      data-testid="ground"
      style={{
        background: "var(--surface-page)",
        color: "var(--text-primary)",
        padding: "1rem",
      }}
    >
      <p data-testid="body">
        Body text with <Link {...args} /> inside it.
      </p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: "the feed" });

    const accent = getComputedStyle(link).color;
    const body = getComputedStyle(canvas.getByTestId("body")).color;
    const ground = getComputedStyle(canvas.getByTestId("ground")).backgroundColor;

    // Colour alone tells it apart from the sentence around it (G183) ...
    await expect(contrast(accent, body)).toBeGreaterThanOrEqual(3);
    // ... while still reading as text on the page it sits on (1.4.3).
    await expect(contrast(accent, ground)).toBeGreaterThanOrEqual(4.5);
  },
};

/** Each style rests as its name says, before anything is hovered or focused. */
export const EachUnderlineStyleRestsAsItSays: Story = {
  render: (args) => (
    <div>
      {UNDERLINES.map((underline) => (
        <Link key={underline} {...args} underline={underline}>
          {underline}
        </Link>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const at = (name: LinkUnderline) =>
      getComputedStyle(canvas.getByRole("link", { name }));

    await expect(at("none").textDecorationLine).toBe("none");

    // The other three all declare the line; only its colour separates them.
    await expect(at("always").textDecorationLine).toContain("underline");
    await expect(at("always").textDecorationColor).toBe(at("always").color);

    await expect(at("hover").textDecorationLine).toContain("underline");
    await expect(at("hover").textDecorationColor).toBe("rgba(0, 0, 0, 0)");

    await expect(at("subtle").textDecorationLine).toContain("underline");
    await expect(at("subtle").textDecorationColor).not.toBe(at("subtle").color);
    await expect(at("subtle").textDecorationColor).not.toBe("rgba(0, 0, 0, 0)");
  },
};

/** No line means no line: hovering must not grow one. */
export const NoUnderlineStaysNoUnderline: Story = {
  args: { underline: "none" },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "the feed" });

    await expect(getComputedStyle(link).textDecorationLine).toBe("none");

    await userEvent.tab();
    await expect(link).toHaveFocus();
    await expect(getComputedStyle(link).textDecorationLine).toBe("none");
  },
};

/** Already at full strength, so the state is carried by the lift, not the line. */
export const AnAlwaysStyleLiftsRatherThanThickens: Story = {
  args: { underline: "always" },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "the feed" });
    // Read as strings, not through the declaration: `getComputedStyle` returns a
    // live object, so holding onto it would report the focused values back.
    const { textUnderlineOffset: offset, textDecorationThickness: thickness } =
      getComputedStyle(link);

    await userEvent.tab();
    await expect(link).toHaveFocus();

    await waitFor(() => {
      const lifted = getComputedStyle(link);
      expect(lifted.textUnderlineOffset).not.toBe(offset);
      // The lift is the whole change: thin-to-thick was ruled out.
      expect(lifted.textDecorationThickness).toBe(thickness);
    });
  },
};

/**
 * The point of a shared vocabulary: both components resolve a tone to the same
 * token, checked against each other rather than against a copy of the mapping.
 */
export const AToneMeansTheSameThingInBothComponents: Story = {
  render: (args) => (
    <div>
      {(["primary", "secondary", "tertiary", "muted"] as const).map((tone) => (
        <p key={tone}>
          <Typography as="span" tone={tone} data-text={tone}>
            text
          </Typography>
          <Link {...args} tone={tone} data-link={tone}>
            {tone}
          </Link>
        </p>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const tone of ["primary", "secondary", "tertiary", "muted"]) {
      const text = canvasElement.querySelector(`[data-text="${tone}"]`)!;
      const link = canvasElement.querySelector(`[data-link="${tone}"]`)!;

      await expect(getComputedStyle(link).color).toBe(
        getComputedStyle(text).color,
      );
    }
  },
};

/** A link cannot default to inheriting: inheriting is how it would say nothing. */
export const ALinkAnnouncesItselfByDefault: Story = {
  render: (args) => (
    <p>
      <Typography as="span" tone="primary" data-text="body">
        Body text with
      </Typography>{" "}
      <Link {...args} data-link="default">
        the feed
      </Link>{" "}
      <Link {...args} tone="accent" data-link="accent">
        and the feed again
      </Link>
    </p>
  ),
  play: async ({ canvasElement }) => {
    const q = (k: string, v: string) =>
      getComputedStyle(canvasElement.querySelector(`[data-${k}="${v}"]`)!).color;

    await expect(q("link", "default")).toBe(q("link", "accent"));
    await expect(q("link", "default")).not.toBe(q("text", "body"));
  },
};

/** Tone and underline compose: the line takes the colour the tone chose. */
export const ATonedLinkKeepsItsUnderlineContract: Story = {
  args: { tone: "muted", underline: "always" },
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "the feed" });
    const painted = getComputedStyle(link);

    await expect(painted.textDecorationLine).toContain("underline");
    await expect(painted.textDecorationColor).toBe(painted.color);
  },
};
