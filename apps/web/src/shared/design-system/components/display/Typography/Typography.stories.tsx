import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Typography } from "./Typography";
import type {
  TypographyTitleVariant,
  TypographyVariant,
} from "./Typography.types";

const TITLES: TypographyTitleVariant[] = [
  "display-large",
  "display-medium",
  "heading-large",
  "heading-medium",
  "heading-small",
];

const ALL: TypographyVariant[] = [
  ...TITLES,
  "body-large",
  "body-medium",
  "body-small",
  "label-large",
  "label-medium",
  "label-small",
];

/** What each title style has to resolve to, read back from the rendered element. */
const EXPECTED: Record<
  TypographyTitleVariant,
  { size: string; weight: string }
> = {
  "display-large": { size: "36px", weight: "700" },
  "display-medium": { size: "30px", weight: "700" },
  "heading-large": { size: "24px", weight: "600" },
  "heading-medium": { size: "20px", weight: "600" },
  "heading-small": { size: "18px", weight: "600" },
};

const meta = {
  title: "Design System/Display/Typography",
  component: Typography,
  tags: ["autodocs"],
  parameters: {
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "muted"],
    },
  },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "The quick brown fox jumps over the lazy dog" },
};

export const Scale: Story = {
  args: { children: "Scale" },
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {ALL.map((variant) =>
        TITLES.includes(variant as TypographyTitleVariant) ? (
          <Typography
            key={variant}
            variant={variant as TypographyTitleVariant}
            as="p"
          >
            {variant}
          </Typography>
        ) : (
          <Typography key={variant} variant={variant as "body-medium"}>
            {variant}
          </Typography>
        ),
      )}
    </div>
  ),
};

export const Tones: Story = {
  args: { children: "Tones" },
  render: () => (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {(["primary", "secondary", "tertiary", "muted"] as const).map((tone) => (
        <Typography key={tone} tone={tone}>
          {tone}
        </Typography>
      ))}
    </div>
  ),
};

/**
 * A style that names a size and a weight has to deliver them, and the heading
 * family is the half a call site cannot see: every one of these binds it, and
 * nothing else in the layer did until they existed.
 */
export const TitleStylesResolve: Story = {
  args: { children: "Resolve" },
  render: () => (
    <div>
      {TITLES.map((variant) => (
        <Typography key={variant} variant={variant} as="p" data-variant={variant}>
          {variant}
        </Typography>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const variant of TITLES) {
      const element = canvasElement.querySelector<HTMLElement>(
        `[data-variant="${variant}"]`,
      )!;
      const { fontSize, fontWeight, fontFamily } = getComputedStyle(element);

      await expect(fontSize).toBe(EXPECTED[variant].size);
      await expect(fontWeight).toBe(EXPECTED[variant].weight);
      await expect(fontFamily).toContain("Inter");
    }
  },
};

/**
 * The separation the whole design turns on: looking like a heading is not what
 * puts one in the document outline. A style may be worn by any permitted
 * element, and choosing one must not change the other.
 */
export const StyleAndElementAreIndependent: Story = {
  args: { children: "Independent" },
  render: () => (
    <div>
      <Typography variant="heading-large" as="h2" data-case="as-heading">
        A heading style on a heading element
      </Typography>
      <Typography variant="heading-large" as="span" data-case="as-span">
        The same style on a span
      </Typography>
      <Typography variant="body-small" as="p" data-case="body">
        Body on a paragraph
      </Typography>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const pick = (name: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-case="${name}"]`)!;

    const heading = pick("as-heading");
    const span = pick("as-span");
    const body = pick("body");

    // The element follows `as`.
    await expect(heading.tagName).toBe("H2");
    await expect(span.tagName).toBe("SPAN");

    // The appearance follows `variant`, and does not follow the element.
    await expect(getComputedStyle(heading).fontSize).toBe(
      getComputedStyle(span).fontSize,
    );
    await expect(getComputedStyle(body).fontSize).not.toBe(
      getComputedStyle(heading).fontSize,
    );
  },
};

/**
 * Colour is not part of a text style, and none is imposed without a tone — so
 * text lands in whatever colour the surface around it establishes, and a
 * container that sets its own is composed rather than overridden.
 */
export const InheritsWithoutTone: Story = {
  args: { children: "Inherits" },
  render: () => (
    <div style={{ color: "rgb(0, 128, 0)" }} data-host>
      <Typography data-case="untoned">No tone</Typography>
      <Typography variant="display-large" as="p" data-case="untoned-title">
        Nor here
      </Typography>
      <Typography tone="muted" data-case="toned">
        Muted
      </Typography>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<HTMLElement>("[data-host]")!;
    const pick = (name: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-case="${name}"]`)!;

    const inherited = getComputedStyle(host).color;

    // No tone, no colour of its own — whatever the variant.
    await expect(getComputedStyle(pick("untoned")).color).toBe(inherited);
    await expect(getComputedStyle(pick("untoned-title")).color).toBe(inherited);

    // A tone binds the emphasis vocabulary, so it departs from the host.
    await expect(getComputedStyle(pick("toned")).color).not.toBe(inherited);
  },
};
