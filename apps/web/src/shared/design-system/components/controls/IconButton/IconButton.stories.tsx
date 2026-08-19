import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import {
  CONTROL_SIZES,
  ROLES,
  THEMES,
  THEME_ATTRIBUTE,
} from "../../../foundations";
import { EyeIcon, EyeOffIcon, SearchIcon, TrashIcon } from "../../../icons";
import { IconButton } from "./IconButton";
import type { IconButtonShape, IconButtonVariant } from "./IconButton.types";

const VARIANTS: IconButtonVariant[] = ["contained", "outlined", "ghost"];
const SHAPES: IconButtonShape[] = ["rounded", "circle"];

/** A `render` story builds its own instances, but the type still requires these. */
const baseArgs = { icon: <SearchIcon />, "aria-label": "Search" };

const meta = {
  title: "Design System/Controls/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  parameters: {
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    shape: { control: "radio", options: SHAPES },
    color: { control: "select", options: [...ROLES] },
    size: { control: "radio", options: CONTROL_SIZES },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { icon: <SearchIcon />, "aria-label": "Search" },
};

export const Variants: Story = {
  args: baseArgs,
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {VARIANTS.map((variant) => (
        <IconButton
          key={variant}
          variant={variant}
          color="primary"
          icon={<SearchIcon />}
          aria-label={`Search ${variant}`}
        />
      ))}
    </div>
  ),
};

/** Both shapes across the whole role scale, since a shape has to hold for each. */
export const Shapes: Story = {
  args: baseArgs,
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {SHAPES.map((shape) => (
        <div
          key={shape}
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
        >
          {ROLES.map((color) => (
            <IconButton
              key={color}
              shape={shape}
              variant="contained"
              color={color}
              icon={<TrashIcon />}
              aria-label={`Delete ${shape} ${color}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Roles: Story = {
  args: baseArgs,
  render: () => (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {VARIANTS.map((variant) => (
        <div
          key={variant}
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
        >
          {ROLES.map((color) => (
            <IconButton
              key={color}
              variant={variant}
              color={color}
              icon={<SearchIcon />}
              aria-label={`${variant} ${color}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * The minimum hit target is a platform basis rather than a design choice, and
 * the smallest size sits exactly on it — which is precisely the size a later
 * change is most likely to push below it without anyone noticing.
 */
export const Sizes: Story = {
  args: baseArgs,
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {CONTROL_SIZES.map((size) => (
        <IconButton
          key={size}
          size={size}
          icon={<SearchIcon />}
          aria-label={`Search ${size}`}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

      const buttons = [...canvasElement.querySelectorAll("button")];
      await expect(buttons).toHaveLength(CONTROL_SIZES.length);

      for (const button of buttons) {
        const { width, height } = button.getBoundingClientRect();
        await expect(width).toBeGreaterThanOrEqual(24);
        await expect(height).toBeGreaterThanOrEqual(24);
      }
    }

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};

/** The indicator is composed, never declared — and it marks keyboard focus only. */
export const FocusIndicator: Story = {
  args: { icon: <SearchIcon />, "aria-label": "Search" },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button")!;

    await userEvent.tab();
    await expect(button).toHaveFocus();

    // The indicator is composed, not declared: the shared class is on the root,
    // and this component's own stylesheet paints no ring of its own.
    await expect(button.className).toMatch(/focusRing/);
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(
      parseFloat(getComputedStyle(button).outlineWidth),
    ).toBeGreaterThan(0);

    // Two things are deliberately not asserted here, because a result either way
    // would say nothing about this component. That a pointer click leaves the
    // ring off: user-event focuses programmatically, which trips the browser's
    // focus-visible heuristic. And the ring's resolved colour: in this harness it
    // tracks currentColor rather than --focus-ring for every control in the
    // layer, Button included, which is a layer-wide question and not this one.
  },
};

/** Loading composes the shared Spinner and makes the control unavailable. */
export const Loading: Story = {
  args: { icon: <SearchIcon />, "aria-label": "Search", isLoading: true },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button")!;
    await expect(button).toBeDisabled();

    const indicator = button.querySelector("[aria-hidden='true']");
    await expect(indicator).not.toBeNull();
    await expect(button.querySelector("svg")).toBeNull();
  },
};

/**
 * The component imposes **no** pressed treatment, coloured or not: the caller
 * shows the state through the icon it supplies, as PasswordToggle already does,
 * and `aria-pressed` stays the caller's. The only foreground strong enough to
 * read as a state is the role's fill, and a fill is not a text colour — it
 * equals the resting colour outright in the light theme and falls under the 3:1
 * floor in the dark one.
 */
export const Toggle: Story = {
  args: baseArgs,
  render: function Render() {
    const [pressed, setPressed] = useState(false);
    return (
      <IconButton
        icon={pressed ? <EyeOffIcon /> : <EyeIcon />}
        aria-label={pressed ? "Hide password" : "Show password"}
        aria-pressed={pressed}
        onClick={() => setPressed((value) => !value)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector("button")!;
    const resting = getComputedStyle(button).color;

    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    // The contract, asserted: pressing changes the accessible state and nothing
    // this component paints. The icon is what changed, and the caller swapped it.
    await expect(getComputedStyle(button).color).toBe(resting);
  },
};

/** With a role, the state is still the caller's — the component adds nothing. */
export const ToggleWithRole: Story = {
  args: baseArgs,
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <IconButton
        color="error"
        icon={<TrashIcon />}
        aria-label="Delete, resting"
      />
      <IconButton
        color="error"
        aria-pressed
        icon={<TrashIcon />}
        aria-label="Delete, pressed"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [resting, pressed] = [...canvasElement.querySelectorAll("button")];

    await expect(pressed).toHaveAttribute("aria-pressed", "true");
    await expect(getComputedStyle(pressed).color).toBe(
      getComputedStyle(resting).color,
    );
  },
};

/**
 * The two states are independent: `aria-pressed` is what the control currently
 * is, `isLoading` is an operation in flight, and neither replaces the other.
 */
export const PressedWhileLoading: Story = {
  args: baseArgs,
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <IconButton
        color="error"
        aria-pressed
        icon={<TrashIcon />}
        aria-label="Pressed"
      />
      <IconButton
        color="error"
        aria-pressed
        isLoading
        icon={<TrashIcon />}
        aria-label="Pressed, loading"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [pressed, pressedLoading] = [
      ...canvasElement.querySelectorAll("button"),
    ];

    // Independence, asserted structurally rather than visually: the in-flight
    // operation disables the control and swaps in the indicator, and the state
    // the control is *in* survives both.
    await expect(pressed).toHaveAttribute("aria-pressed", "true");
    await expect(pressed).not.toBeDisabled();
    await expect(pressed.querySelector("svg")).not.toBeNull();

    await expect(pressedLoading).toHaveAttribute("aria-pressed", "true");
    await expect(pressedLoading).toBeDisabled();
    await expect(
      pressedLoading.querySelector("[aria-hidden='true']"),
    ).not.toBeNull();
  },
};
