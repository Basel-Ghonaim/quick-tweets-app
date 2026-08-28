import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { PlusIcon } from "../../../icons";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button.types";
import {
  CONTROL_SIZES,
  ROLES,
  THEMES,
  THEME_ATTRIBUTE,
} from "../../../foundations";

const meta = {
  title: "Design System/Controls/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    // a11y is promoted to failing for this migrated component; the global default
    // stays reporting until every component has migrated onto the semantic tier.
    a11y: { test: "error" },
  },
  argTypes: {
    variant: { control: "select", options: ["contained", "outlined", "ghost"] },
    color: {
      control: "select",
      options: ["primary", "secondary", "success", "warning", "error", "info"],
    },
    size: { control: "radio", options: CONTROL_SIZES },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS: ButtonVariant[] = ["contained", "outlined", "ghost"];
// Availability is two independent flags, so the matrix enumerates their
// combinations rather than the positions of a single enum.
const AVAILABILITY = [
  { label: "idle", props: {} },
  { label: "loading", props: { isLoading: true } },
  { label: "disabled", props: { disabled: true } },
] as const;

// --- Base Default Story
export const Default: Story = {
  args: {
    children: "Button",
    variant: "contained",
    color: "primary",
    size: "medium",
  },
};

// --- Variant Matrix
export const Outlined: Story = {
  args: { ...Default.args, variant: "outlined" },
};

export const Ghost: Story = {
  args: { ...Default.args, variant: "ghost" },
};

// --- Availability
export const Loading: Story = {
  args: { ...Default.args, isLoading: true, loadingText: "Submitting..." },
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};

// Every variant in every availability combination — the surface the a11y check
// and the theme switcher exercise. Switch the toolbar theme to see both
// resolutions.
export const StateMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {AVAILABILITY.map(({ label, props }) => (
            <Button key={label} variant={variant} loadingText="Loading" {...props}>
              {variant} · {label}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {CONTROL_SIZES.map((size) => (
        <Button key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

// Every role, so the on-fill text (contained) and on-surface text (outlined/ghost)
// are exercised across the whole scale in both themes.
export const Roles: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {ROLES.map((color) => (
            <Button key={color} variant={variant} color={color}>
              {color}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * The busy indicator is shared now, so what has to keep holding is that each
 * host still governs it: the arc takes the host's own text colour and the box
 * tracks the host's font size, both by inheritance rather than by a prop. That
 * is the coupling a refactor breaks without anything else noticing.
 */
export const SpinnerInheritsFromHost: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      {VARIANTS.flatMap((variant) =>
        CONTROL_SIZES.map((size) => (
          <Button
            key={`${variant}-${size}`}
            variant={variant}
            size={size}
            isLoading
            loadingText="Loading"
          >
            Save
          </Button>
        )),
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

      const buttons = [...canvasElement.querySelectorAll("button")];
      await expect(buttons).toHaveLength(VARIANTS.length * CONTROL_SIZES.length);

      for (const button of buttons) {
        const spinner = button.querySelector<HTMLElement>("[aria-hidden='true']");
        await expect(spinner).not.toBeNull();

        const host = getComputedStyle(spinner!.parentElement!);
        const arc = getComputedStyle(spinner!);
        await expect(arc.borderBlockStartColor).toBe(host.color);
        await expect(parseFloat(arc.width)).toBeCloseTo(
          parseFloat(host.fontSize) * 1.25,
          1,
        );
      }
    }

    if (previous) document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

/** Loading is two facts, and `disabled` can only carry one of them. */
export const LoadingIsAnnounced: Story = {
  args: { ...Default.args, isLoading: true, loadingText: "Submitting..." },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button")!;
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toBeDisabled();
  },
};

/**
 * A button inside a form submits it unless it says otherwise, and a submit is a
 * decision a caller makes rather than one it inherits.
 */
export const ADefaultButtonDoesNotSubmit: Story = {
  render: function Render() {
    const [submits, setSubmits] = useState(0);
    return (
      <form onSubmit={(e) => { e.preventDefault(); setSubmits((n) => n + 1); }}>
        <Button>Default</Button>
        <Button type="submit">Submit</Button>
        <output data-testid="count">{submits}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const count = canvas.getByTestId("count");

    await userEvent.click(canvas.getByRole("button", { name: "Default" }));
    await expect(count).toHaveTextContent("0");

    // The caller's own choice still reaches the element.
    await userEvent.click(canvas.getByRole("button", { name: "Submit" }));
    await expect(count).toHaveTextContent("1");
  },
};

/**
 * A slot takes a node the caller owns, and the caller owns what it announces.
 * The layer's own icons all hide themselves, so a button's name is its text --
 * this renders the slot no other story does, and asks.
 */
export const AButtonsNameIsItsTextAlone: Story = {
  args: { ...Default.args, children: "Publish", leftIcon: <PlusIcon /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Found by the text alone: the glyph contributes nothing to the name.
    const button = canvas.getByRole("button", { name: "Publish" });

    const glyph = button.querySelector("svg")!;
    await expect(glyph).toHaveAttribute("aria-hidden", "true");

    // The slot itself is not hidden -- a caller who supplies a meaningful node
    // can still have it announced, which an ancestor `aria-hidden` would
    // remove irrecoverably.
    await expect(glyph.parentElement).not.toHaveAttribute("aria-hidden");
  },
};
