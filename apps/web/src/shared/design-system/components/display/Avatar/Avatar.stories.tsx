import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { THEMES, THEME_ATTRIBUTE } from "../../../foundations";
import { Avatar } from "./Avatar";
import type { AvatarSize } from "./Avatar.types";

/** Inline, so the lane proves the component rather than a network fetch. */
const PICTURE =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2080%2040'%3E%3Crect%20width='80'%20height='40'%20fill='%236d658c'/%3E%3Ccircle%20cx='60'%20cy='13'%20r='8'%20fill='%23f5f3fd'/%3E%3C/svg%3E";

/** An empty payload cannot decode, so the failure is the browser's and needs no
 *  server to produce it. */
const UNREACHABLE = "data:image/png;base64,";

const SIZES: AvatarSize[] = [
  "small",
  "medium",
  "large",
  "xlarge",
  "xxlarge",
];

const DIAMETER: Record<AvatarSize, number> = {
  small: 32,
  medium: 40,
  large: 48,
  xlarge: 72,
  xxlarge: 96,
};

const meta = {
  title: "Design System/Display/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: {
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  argTypes: {
    size: { control: "select", options: SIZES },
  },
  args: { src: PICTURE, alt: "" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The picture is not square, so a circle that did not crop would distort it. */
export const CropsToTheCircle: Story = {
  play: async ({ canvasElement }) => {
    const image = canvasElement.querySelector("img") as HTMLImageElement;

    await expect(getComputedStyle(image).objectFit).toBe("cover");

    const { width, height } = image.getBoundingClientRect();
    await expect(Math.round(width)).toBe(Math.round(height));
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      {SIZES.map((size) => (
        <Avatar key={size} size={size} src={PICTURE} alt="" />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const rendered = [...canvasElement.querySelectorAll("span")];
    await expect(rendered).toHaveLength(SIZES.length);

    // Each name must reach its own diameter: a mapping that pointed two names at
    // one class would still render, and only the measurement says otherwise.
    for (const [index, size] of SIZES.entries()) {
      const { width, height } = rendered[index].getBoundingClientRect();
      await expect(Math.round(width)).toBe(DIAMETER[size]);
      await expect(Math.round(height)).toBe(DIAMETER[size]);
    }
  },
};

/** Nothing to show: the glyph stands in, and announces nothing of its own. */
export const NoPicture: Story = {
  args: { src: undefined },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("img")).toBeNull();

    const glyph = canvasElement.querySelector("svg") as SVGElement;
    await expect(glyph).toBeInTheDocument();
    await expect(glyph).toHaveAttribute("aria-hidden", "true");
  },
};

/**
 * The design draws "no picture" but never "the picture did not arrive", which
 * would otherwise render a broken image with none of the fallback's treatment.
 */
export const UnreachablePicture: Story = {
  args: { src: UNREACHABLE, alt: "Lina Haddad" },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(canvasElement.querySelector("img")).toBeNull();
    });

    await expect(canvasElement.querySelector("svg")).toBeInTheDocument();
  },
};

/** The picture carries a reader's words only where the caller gives it some. */
export const NamedAndDecorative: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <Avatar src={PICTURE} alt="Lina Haddad" />
      <Avatar src={PICTURE} alt="" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [named, decorative] = [...canvasElement.querySelectorAll("img")];

    await expect(named).toHaveAccessibleName("Lina Haddad");
    await expect(decorative).toHaveAccessibleName("");
  },
};

/**
 * The ground and the glyph are theme-resolved rather than fixed: a literal would
 * render the same in both, which is the failure this samples for.
 */
export const GroundResolvesPerTheme: Story = {
  args: { src: undefined },
  play: async ({ canvasElement }) => {
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const circle = canvasElement.querySelector("span") as HTMLElement;
    const seen: string[] = [];

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      const { backgroundColor, color } = getComputedStyle(circle);
      seen.push(`${backgroundColor} ${color}`);
    }

    await expect(new Set(seen).size).toBe(THEMES.length);

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

/** Beside a long name it holds its width, and takes the side the page reads from. */
export const KeepsItsSizeBesideText: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        inlineSize: "220px",
      }}
    >
      <Avatar src={PICTURE} alt="" />
      <span style={{ font: "var(--type-body-medium)" }}>
        A display name long enough to want the space the circle is holding
      </span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const circle = canvasElement.querySelector("span") as HTMLElement;

    await expect(Math.round(circle.getBoundingClientRect().width)).toBe(
      DIAMETER.medium,
    );
  },
};
