import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Input } from "./Input";
import { SearchIcon, XIcon } from "../../../icons";
import {
  CONTROL_SIZES,
  ROLES,
  THEMES,
  THEME_ATTRIBUTE,
} from "../../../foundations";

const meta = {
  title: "Design System/Fields/Input",
  parameters: {
    // Promoted now that the legacy colour bindings are gone; the global default
    // stays reporting until every component has migrated onto the semantic tier.
    a11y: { test: "error" },
  },
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["outlined", "filled", "underlined"] },
    shape: { control: "radio", options: ["rounded", "pill"] },
    color: { control: "select", options: [...ROLES] },
    size: { control: "radio", options: CONTROL_SIZES },
    isInvalid: { control: "boolean" },
    isLoading: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Email",
    placeholder: "Enter text...",
    variant: "outlined",
    color: "primary",
    size: "medium",
  },
};

export const Filled: Story = {
  args: { ...Default.args, variant: "filled" },
};

export const Underlined: Story = {
  // The spread's type admits a shape, which an underlined field refuses.
  args: { ...Default.args, variant: "underlined", shape: undefined },
};

export const WithHelperText: Story = {
  args: { ...Default.args, helperText: "We never share your address." },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    isInvalid: true,
    defaultValue: "Wrong input",
    errorMessage: "That address is not valid.",
    helperText: "We never share your address.",
  },
};

export const Loading: Story = {
  args: { ...Default.args, isLoading: true, defaultValue: "Validating..." },
};

export const Password: Story = {
  args: { ...Default.args, label: "Password", type: "password", revealLabel: "Show password" },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true, defaultValue: "Unavailable" },
};

export const WithIcons: Story = {
  args: {
    ...Default.args,
    prefix: <span>🔍</span>,
    suffix: <span>❌</span>,
  },
};

export const Sizes: Story = {
  args: Default.args,
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {CONTROL_SIZES.map((size) => (
        <Input key={size} {...args} size={size} label={size} />
      ))}
    </div>
  ),
};

/**
 * The field's adornment is what colours the indicator, so the shared Spinner
 * has to keep inheriting rather than carrying a colour of its own. Asserted in
 * both themes, because the adornment's colour is theme-resolved.
 */
export const SpinnerInheritsFromAdornment: Story = {
  args: { ...Default.args, isLoading: true },
  play: async ({ canvasElement }) => {
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

      const spinner = canvasElement.querySelector<HTMLElement>(
        "[aria-hidden='true']",
      );
      await expect(spinner).not.toBeNull();

      const host = getComputedStyle(spinner!.parentElement!);
      const arc = getComputedStyle(spinner!);
      await expect(arc.borderBlockStartColor).toBe(host.color);
      await expect(parseFloat(arc.width)).toBeCloseTo(
        parseFloat(host.fontSize) * 1.25,
        1,
      );
    }

    if (previous) document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

/**
 * The visibility toggle is the shared IconButton now, so what has to hold is
 * what it gained: a hit target that clears the minimum, and the owned focus
 * indicator drawn inward — the field clips its children to its own radius, so
 * an outward ring would be cut off.
 */
export const PasswordToggleMeetsTheTarget: Story = {
  args: { ...Default.args, label: "Password", type: "password", revealLabel: "Show password" },
  play: async ({ canvasElement }) => {
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

      const toggle = canvasElement.querySelector("button")!;
      await expect(toggle).toHaveAttribute("aria-pressed", "false");

      const { width, height } = toggle.getBoundingClientRect();
      await expect(width).toBeGreaterThanOrEqual(24);
      await expect(height).toBeGreaterThanOrEqual(24);

      // Composed, not declared — and both halves, since the inset one is what
      // keeps the ring inside a control that clips. Anchored on the generated
      // prefix so the base class cannot be satisfied by the inset one, which
      // contains its name.
      await expect(toggle.className).toMatch(/_focusRing_/);
      await expect(toggle.className).toMatch(/_focusRingInset_/);
    }

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

/**
 * A loading password field keeps the means of revealing its value.
 *
 * The indicator is found by class rather than by `aria-hidden`: the eye glyph
 * sets that attribute too, so the selector the other loading story uses would
 * match whichever comes first here.
 */
export const LoadingPasswordKeepsItsToggle: Story = {
  args: { ...Default.args, label: "Password", type: "password", revealLabel: "Show password", isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const toggle = await canvas.findByRole("button", { name: /Show password/i });
    const spinner = canvasElement.querySelector('[class*="_root_"][aria-hidden="true"]');
    await expect(spinner).not.toBeNull();

    // Ordered so the toggle does not move when the indicator arrives.
    await expect(
      toggle.compareDocumentPosition(spinner!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // The field is busy, and unlike a Control it stays usable.
    const input = canvasElement.querySelector("input")!;
    await expect(input).toHaveAttribute("aria-busy", "true");
    await expect(input).not.toBeDisabled();
  },
};

/**
 * Visibility is held twice -- by this field, which derives the input's `type`,
 * and by the toggle, which reports it. They can only disagree if the toggle
 * unmounts, so this drives a whole load cycle and asks them afterwards.
 */
export const RevealSurvivesALoadCycle: Story = {
  render: function Render(args) {
    const [busy, setBusy] = useState(false);
    return (
      <>
        <Input {...args} isLoading={busy} />
        <button type="button" onClick={() => setBusy((v) => !v)}>
          toggle busy
        </button>
      </>
    );
  },
  args: { ...Default.args, label: "Password", type: "password", revealLabel: "Show password" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector("input")!;
    const busy = canvas.getByRole("button", { name: /toggle busy/i });

    await userEvent.click(await canvas.findByRole("button", { name: /Show password/i }));
    await expect(input).toHaveAttribute("type", "text");

    await userEvent.click(busy);
    await userEvent.click(busy);

    // The value is still revealed, and the control still says so — through the
    // pressed state alone, which is now the only channel that carries it.
    await expect(input).toHaveAttribute("type", "text");
    const after = await canvas.findByRole("button", { name: /Show password/i });
    await expect(after).toHaveAttribute("aria-pressed", "true");
  },
};

/** A name a reader might type in Arabic. */
const ARABIC_NAME = "باسل";

const directionOf = (canvasElement: HTMLElement, name: string) =>
  getComputedStyle(canvasElement.querySelector(`[data-case="${name}"]`)!).direction;

/** Words a reader types take their own direction, whichever way the page reads. */
export const WordsTakeTheirOwnDirection: Story = {
  args: { label: "Name" },
  render: () => (
    <div>
      <Input label="Arabic name" defaultValue={ARABIC_NAME} data-case="arabic" />
      <Input label="Latin name" defaultValue="Basel" data-case="latin" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(directionOf(canvasElement, "arabic")).toBe("rtl");
    await expect(directionOf(canvasElement, "latin")).toBe("ltr");
  },
};

/** An identifier reads left to right in any document, empty or not. */
export const AnIdentifierReadsLeftToRight: Story = {
  args: { label: "Email" },
  render: () => (
    <div>
      <Input label="Empty email" type="email" placeholder="you@example.com" data-case="empty" />
      <Input label="Email" type="email" defaultValue="you@example.com" data-case="filled" />
      <Input label="Password" type="password" revealLabel="Show password" data-case="password" />
      <Input label="Username" placeholder="username" dir="ltr" data-case="stated" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const name of ["empty", "filled", "password", "stated"])
      await expect(directionOf(canvasElement, name)).toBe("ltr");
  },
};

/** Before anything is typed, a field's placeholder reads as the page does. */
export const AnEmptyFieldReadsAsThePageDoes: Story = {
  args: { label: "Name" },
  render: () => <Input label="Display name" placeholder="Name" data-case="empty" />,
  play: async ({ canvasElement }) => {
    const page = getComputedStyle(document.documentElement).direction;
    await expect(directionOf(canvasElement, "empty")).toBe(page);
  },
};

/** The search field the designs draw: filled, at the medium size, fully rounded. */
export const Pill: Story = {
  args: {
    label: "Search",
    placeholder: "Search Quick Tweets",
    type: "search",
    variant: "filled",
    shape: "pill",
    prefix: <SearchIcon />,
  },
};

const fullRadius = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--border-radius-full").trim();

const controlOf = (canvasElement: HTMLElement, name: string) =>
  canvasElement.querySelector<HTMLElement>(`[data-case="${name}"]`)!.parentElement!;

/** Both variants that draw a boundary take the pill, and it is the token's radius, not a lookalike. */
export const ThePillRoundsItsWholeBoundary: Story = {
  args: Pill.args,
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Input label="Filled" variant="filled" shape="pill" data-case="filled" />
      <Input label="Outlined" variant="outlined" shape="pill" data-case="outlined" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(fullRadius()).not.toBe("");

    for (const name of ["filled", "outlined"])
      await expect(getComputedStyle(controlOf(canvasElement, name)).borderRadius).toBe(
        fullRadius(),
      );
  },
};

/**
 * The ring is drawn on the boundary itself, so it takes whatever radius that boundary has.
 * Compared with the resting radius rather than the token, so a pill that lost its radius fails elsewhere.
 */
export const ThePillsFocusFollowsItsRadius: Story = {
  args: Pill.args,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector("input")!;
    const control = input.parentElement!;
    const resting = getComputedStyle(control).borderRadius;

    await expect(getComputedStyle(control).outlineStyle).toBe("none");
    await userEvent.tab();
    await expect(input).toHaveFocus();

    const focused = getComputedStyle(control);
    await expect(focused.outlineStyle).toBe("solid");
    await expect(focused.borderRadius).toBe(resting);
  },
};

type Box = { left: number; right: number; top: number; bottom: number };

/** Whether a box lies inside a rounded rectangle, which the control clips its children to. */
const liesInside = (box: Box, shape: Box, radius: number) => {
  const r = Math.min(radius, (shape.bottom - shape.top) / 2, (shape.right - shape.left) / 2);
  const corners = [
    [box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom],
  ];
  return corners.every(([x, y]) => {
    if (x < shape.left - 0.5 || x > shape.right + 0.5 || y < shape.top - 0.5 || y > shape.bottom + 0.5)
      return false;
    const cx = Math.min(Math.max(x, shape.left + r), shape.right - r);
    const cy = Math.min(Math.max(y, shape.top + r), shape.bottom - r);
    return Math.hypot(x - cx, y - cy) <= r + 0.5;
  });
};

/**
 * A pill's ends are round, and the control clips what it holds, so an affordance near an end
 * could be cut. Each one is measured against the rounded shape, at the edge the reading direction gives it.
 */
export const ThePillKeepsItsAdornmentsInside: Story = {
  args: Pill.args,
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", inlineSize: 320 }}>
      <Input
        label="Search"
        variant="filled"
        shape="pill"
        prefix={<SearchIcon />}
        suffix={<XIcon />}
        data-case="adorned"
      />
      <Input
        label="Password"
        type="password"
        revealLabel="Show password"
        variant="outlined"
        shape="pill"
        isLoading
        data-case="owned"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const rtl = getComputedStyle(document.documentElement).direction === "rtl";

    for (const name of ["adorned", "owned"]) {
      const input = canvasElement.querySelector<HTMLElement>(`[data-case="${name}"]`)!;
      const control = input.parentElement!;
      const shape = control.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(control).borderTopLeftRadius);
      const field = input.getBoundingClientRect();

      const adornments = [...control.children].filter((child) => child !== input);
      const affordances = adornments.flatMap((slot) => [...slot.children]);
      await expect(affordances.length).toBeGreaterThanOrEqual(2);

      for (const affordance of affordances)
        await expect(liesInside(affordance.getBoundingClientRect(), shape, radius)).toBe(true);

      // Before the words is the reading direction's start, after them its end.
      for (const slot of adornments) {
        const box = slot.getBoundingClientRect();
        const before = slot.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING;
        const atStart = rtl ? box.left >= field.right - 0.5 : box.right <= field.left + 0.5;
        const atEnd = rtl ? box.right <= field.left + 0.5 : box.left >= field.right - 0.5;
        await expect(before ? atStart : atEnd).toBe(true);
      }
    }
  },
};
