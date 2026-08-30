import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Input } from "./Input";
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
  args: { ...Default.args, variant: "underlined" },
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
  args: { ...Default.args, label: "Password", type: "password" },
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
  args: { ...Default.args, label: "Password", type: "password" },
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
  args: { ...Default.args, label: "Password", type: "password", isLoading: true },
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
  args: { ...Default.args, label: "Password", type: "password" },
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
