import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Textarea } from "./Textarea";
import { CONTROL_SIZES } from "../../../foundations";

const meta = {
  title: "Design System/Fields/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: {
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  argTypes: {
    variant: { control: "radio", options: ["plain", "outlined"] },
    size: { control: "radio", options: CONTROL_SIZES },
    resize: { control: "radio", options: ["none", "vertical"] },
    isInvalid: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOREM =
  "The quick brown fox jumps over the lazy dog. " +
  "Pack my box with five dozen liquor jugs. " +
  "How vexingly quick daft zebras jump.";

/**
 * A plain object rather than another story's `args`: the props are a union, and
 * spreading a union does not narrow it, so the resize stories could not state
 * which half they belong to.
 */
const FIELD = {
  label: "Bio",
  placeholder: "Tell people about yourself",
  rows: 4,
  fullWidth: true,
};

const GROWING = {
  label: "Grows as you type",
  autoResize: true,
  maxRows: 6,
  rows: 2,
  fullWidth: true,
  placeholder: "Keep typing…",
  helperText: "Stops growing at six rows.",
} as const;

export const Default: Story = { args: { ...FIELD } };

// ─── Variants ───────────────────────────────────────────────────────────────

export const Outlined: Story = {
  args: { ...FIELD, variant: "outlined" },
};

/**
 * Borderless by design: the surface composing it owns the boundary. On its own
 * it looks unframed, which is the point — see **Plain In A Composer** for how it
 * is meant to be used.
 */
export const Plain: Story = {
  args: { ...FIELD, variant: "plain", label: "What's happening?" },
};

/** The host draws the frame, so the field sits flush inside it rather than nesting one border in another. */
export const PlainInAComposer: Story = {
  args: { ...FIELD },
  render: () => (
    <div
      style={{
        width: "28rem",
        padding: "var(--space-3)",
        border: "var(--border-width-thin) solid var(--border-default)",
        borderRadius: "var(--border-radius-lg)",
        background: "var(--surface-default)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <Textarea
        variant="plain"
        placeholder="What's happening?"
        autoResize
        maxRows={8}
        rows={2}
        fullWidth
        aria-label="What's happening?"
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          font: "var(--type-body-small)",
          color: "var(--text-secondary)",
        }}
      >
        the host owns this row too
      </div>
    </div>
  ),
};

export const Variants: Story = {
  args: { ...FIELD },
  render: () => (
    <div style={{ display: "grid", gap: "1rem", width: "24rem" }}>
      <Textarea variant="outlined" label="outlined" rows={3} fullWidth />
      <Textarea variant="plain" label="plain" rows={3} fullWidth />
    </div>
  ),
};

// ─── Sizes ──────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  args: { ...FIELD },
  render: () => (
    <div style={{ display: "grid", gap: "1rem", width: "24rem" }}>
      {CONTROL_SIZES.map((size) => (
        <Textarea key={size} size={size} label={size} rows={2} fullWidth />
      ))}
    </div>
  ),
};

// ─── States ─────────────────────────────────────────────────────────────────

export const WithHelperText: Story = {
  args: { ...FIELD, helperText: "Up to 160 characters." },
};

export const Invalid: Story = {
  args: {
    ...FIELD,
    isInvalid: true,
    errorMessage: "Bio cannot be empty",
    helperText: "Up to 160 characters.",
  },
};

/** The one state that gives `plain` a boundary: an invalid control has to be findable. */
export const InvalidPlain: Story = {
  args: {
    ...FIELD,
    variant: "plain",
    isInvalid: true,
    errorMessage: "Bio cannot be empty",
  },
};

export const Disabled: Story = {
  args: { ...FIELD, disabled: true, defaultValue: LOREM },
};

export const ReadOnly: Story = {
  args: { ...FIELD, readOnly: true, defaultValue: LOREM },
};

export const Filled: Story = {
  args: { ...FIELD, defaultValue: LOREM },
};

export const WithMaxLength: Story = {
  args: {
    ...FIELD,
    maxLength: 280,
    helperText: "The limit is the native one; a counter belongs to the feature.",
  },
};

export const FullWidthOff: Story = {
  args: { ...FIELD, fullWidth: false, label: "Intrinsic width" },
};

// ─── Resize ─────────────────────────────────────────────────────────────────

export const ResizeVertical: Story = {
  args: {
    ...FIELD,
    resize: "vertical",
    label: "Drag the handle",
    helperText: "The default: vertical only, never both.",
  },
};

export const ResizeNone: Story = {
  args: {
    ...FIELD,
    resize: "none",
    label: "Fixed",
    helperText: "No handle.",
  },
};

/** Grows with the content to a ceiling, then scrolls. The handle is gone, because a control cannot answer to both. */
export const AutoResize: Story = { args: { ...GROWING } };

export const AutoResizeAtItsCeiling: Story = {
  args: {
    ...GROWING,
    defaultValue: Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join(
      "\n",
    ),
  },
};

// ─── Proofs ─────────────────────────────────────────────────────────────────

/**
 * A field cannot render a message without associating it. The wiring is derived
 * rather than remembered, which is what stops an error being visible on screen
 * and absent from the accessibility tree.
 */
export const ErrorIsAssociated: Story = {
  args: {
    ...FIELD,
    isInvalid: true,
    errorMessage: "Bio cannot be empty",
    helperText: "Up to 160 characters.",
  },
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector("textarea")!;
    const described = control.getAttribute("aria-describedby");

    await expect(control).toHaveAttribute("aria-invalid", "true");
    await expect(described).toBeTruthy();

    // Every id it points at resolves, and the error text is among them.
    const targets = described!
      .split(" ")
      .map((id) => canvasElement.querySelector(`#${CSS.escape(id)}`));
    await expect(targets.every(Boolean)).toBe(true);
    await expect(
      targets.some((node) => node?.textContent === "Bio cannot be empty"),
    ).toBe(true);

    await expect(
      within(canvasElement).getByRole("alert").textContent,
    ).toBe("Bio cannot be empty");
  },
};

/** `plain` has no boundary but the indicator is still its own, which is the whole reason it can be borderless. */
export const FocusIndicator: Story = {
  args: { ...FIELD, variant: "plain" },
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector("textarea")!;

    await expect(control.className).toMatch(/_focusRing_/);
    await expect(getComputedStyle(control).borderTopWidth).toBe("1px");
    await expect(getComputedStyle(control).borderTopColor).toBe(
      "rgba(0, 0, 0, 0)",
    );

    await userEvent.tab();
    await expect(control).toHaveFocus();
    await expect(getComputedStyle(control).outlineStyle).toBe("solid");
  },
};

/** The ceiling is derived from the rendered line height, not from a fixed pixel guess. */
export const AutoResizeStopsAtMaxRows: Story = {
  args: {
    label: "Grows",
    autoResize: true,
    maxRows: 4,
    rows: 1,
    fullWidth: true,
  },
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector("textarea")!;
    const startingHeight = control.getBoundingClientRect().height;

    await userEvent.click(control);
    await userEvent.keyboard("one{Enter}two{Enter}three");
    const grownHeight = control.getBoundingClientRect().height;
    await expect(grownHeight).toBeGreaterThan(startingHeight);

    // Past the ceiling it stops growing and scrolls instead.
    await userEvent.keyboard("{Enter}four{Enter}five{Enter}six{Enter}seven");
    const cappedHeight = control.getBoundingClientRect().height;

    const { lineHeight, paddingTop, paddingBottom } = getComputedStyle(control);
    const ceiling =
      parseFloat(lineHeight) * 4 +
      parseFloat(paddingTop) +
      parseFloat(paddingBottom);

    await expect(cappedHeight).toBeLessThanOrEqual(Math.ceil(ceiling) + 2);
    await expect(control.scrollHeight).toBeGreaterThan(cappedHeight);
    // A growing control offers no handle: the two answer the same question.
    await expect(getComputedStyle(control).resize).toBe("none");
  },
};

/** A line a reader might write in Arabic. */
const ARABIC_BIO = "مرحبا بكم";

const directionOf = (canvasElement: HTMLElement, name: string) =>
  getComputedStyle(canvasElement.querySelector(`[data-case="${name}"]`)!).direction;

/** Words a reader writes take their own direction; before any, the placeholder reads as the page does. */
export const WordsTakeTheirOwnDirection: Story = {
  args: { label: "Bio" },
  render: () => (
    <div>
      <Textarea label="Arabic bio" defaultValue={ARABIC_BIO} data-case="arabic" />
      <Textarea label="Latin bio" defaultValue={LOREM} data-case="latin" />
      <Textarea label="Empty bio" placeholder="Tell us about yourself" data-case="empty" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(directionOf(canvasElement, "arabic")).toBe("rtl");
    await expect(directionOf(canvasElement, "latin")).toBe("ltr");
    await expect(directionOf(canvasElement, "empty")).toBe(
      getComputedStyle(document.documentElement).direction,
    );
  },
};
