import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { THEMES, THEME_ATTRIBUTE } from "./resolution";

/** Ascending, which is the whole claim the order makes. Each token is written
 *  out rather than built from the name: an interpolation names a vocabulary the
 *  reference check cannot read, and it would stop resolving these. */
const LAYERS = [
  { name: "sticky", token: "var(--layer-sticky)" },
  { name: "floating-action", token: "var(--layer-floating-action)" },
  { name: "menu", token: "var(--layer-menu)" },
  { name: "dialog", token: "var(--layer-dialog)" },
  { name: "confirmation", token: "var(--layer-confirmation)" },
  { name: "toast", token: "var(--layer-toast)" },
] as const;

const ELEVATIONS = [
  { name: "menu", token: "var(--elevation-menu)" },
  { name: "dialog", token: "var(--elevation-dialog)" },
  { name: "floating-action", token: "var(--elevation-floating-action)" },
  { name: "toast", token: "var(--elevation-toast)" },
] as const;

/**
 * What sits above the page, rendered. The order, the ground and the elevations
 * are stylesheets reacting to attributes, so nothing about them is visible to a
 * check that reads source — the reason icon mirroring earned a story (Finding 0017).
 */
const meta = {
  title: "Foundations/Layering",
  parameters: { layout: "centered", a11y: { test: "error" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The midpoint of where two boxes overlap, read from what was painted rather
 *  than from where they were asked to go, so it holds in both directions. */
const overlapCentre = (a: DOMRect, b: DOMRect) => ({
  x: (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2,
  y: (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2,
});

export const LayersPaintInOrder: Story = {
  render: () => (
    <div style={{ position: "relative", inlineSize: 460, blockSize: 120 }}>
      {LAYERS.map(({ name, token }, index) => (
        <span
          key={name}
          data-layer={name}
          style={{
            position: "absolute",
            insetBlockStart: 0,
            insetInlineStart: index * 60,
            inlineSize: 100,
            blockSize: 100,
            zIndex: token,
            background: "var(--surface-subtle)",
            border: "var(--border-width-thin) solid var(--border-default)",
          }}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const boxes = [...canvasElement.querySelectorAll<HTMLElement>("[data-layer]")];
    await expect(boxes).toHaveLength(LAYERS.length);

    // Pairwise, because an order is a sequence of these and nothing else. Reading
    // each z-index back would only restate the tokens; this asks what was painted.
    for (let i = 0; i < boxes.length - 1; i += 1) {
      const lower = boxes[i];
      const higher = boxes[i + 1];
      const { x, y } = overlapCentre(
        lower.getBoundingClientRect(),
        higher.getBoundingClientRect(),
      );

      await expect(document.elementFromPoint(x, y)).toBe(higher);
    }
  },
};

export const TheGroundCoversThePage: Story = {
  render: () => (
    <div style={{ position: "relative", inlineSize: 320, blockSize: 160 }}>
      <p style={{ margin: 0, font: "var(--type-body-medium)" }}>
        Everything this ground is drawn over.
      </p>
      <span
        data-testid="ground"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: "var(--layer-dialog)",
          background: "var(--overlay-ground)",
        }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const ground = canvasElement.querySelector<HTMLElement>("[data-testid=ground]");
    await expect(ground).toBeInTheDocument();

    const { x, y } = overlapCentre(
      ground!.getBoundingClientRect(),
      ground!.getBoundingClientRect(),
    );
    await expect(document.elementFromPoint(x, y)).toBe(ground);

    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const seen: string[] = [];

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      const { backgroundColor } = getComputedStyle(ground!);
      // A ground that resolved to nothing would still cover the page and prove
      // nothing, so it is checked for being a wash before being compared.
      await expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      seen.push(backgroundColor);
    }

    await expect(new Set(seen).size).toBe(THEMES.length);

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

export const RaisedSurfacesCarryTheirRole: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      {ELEVATIONS.map(({ name, token }) => (
        <span
          key={name}
          data-elevation={name}
          style={{
            inlineSize: 72,
            blockSize: 48,
            background: "var(--surface-default)",
            borderRadius: "var(--border-radius-xl)",
            boxShadow: token,
          }}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const raised = [...canvasElement.querySelectorAll<HTMLElement>("[data-elevation]")];
    await expect(raised).toHaveLength(ELEVATIONS.length);

    const shadows = raised.map((element) => getComputedStyle(element).boxShadow);

    // Each role must resolve to something; an unresolved var leaves `none`, which
    // renders as a flat surface and reads as a design choice.
    for (const shadow of shadows) await expect(shadow).not.toBe("none");

    // The dialog is the one that differs today, and the divergence is the reason
    // these are four tokens rather than two.
    const [menu, dialog] = shadows;
    await expect(dialog).not.toBe(menu);
  },
};
