import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CommentIcon,
  HeartIcon,
  HomeIcon,
  SearchIcon,
  SignOutIcon,
  TrendingIcon,
} from "./components";
import type { IconProps } from "./icon.types";

/** Every glyph whose meaning has a direction, and a sample of those that have
 *  none. A set that turned wholesale would pass a check on the turners alone. */
const TURNS: Array<[string, React.FC<IconProps>]> = [
  ["comment", CommentIcon],
  ["trending", TrendingIcon],
  ["sign out", SignOutIcon],
  ["back", ArrowLeftIcon],
  ["previous", ChevronLeftIcon],
  ["next", ChevronRightIcon],
  ["search", SearchIcon],
];

const STAYS: Array<[string, React.FC<IconProps>]> = [
  ["check", CheckIcon],
  ["heart", HeartIcon],
  ["home", HomeIcon],
  ["chevron up", ChevronUpIcon],
  ["alert circle", AlertCircleIcon],
];

// The direction follows the language in the application; here the attribute is the whole subject.
const stampDirection = (direction: string | null) =>
  direction === null
    ? document.documentElement.removeAttribute("dir")
    : document.documentElement.setAttribute("dir", direction);

/**
 * A glyph that declares it mirrors turns around with the reading direction, and
 * one that does not stays put. Rendered rather than asserted, because the whole
 * mechanism is a stylesheet reacting to an attribute — nothing about it is
 * visible to a check that reads source (Finding 0017).
 */
const meta = {
  title: "Icons/Mirroring",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const scaleX = (element: Element): number => {
  const { transform } = getComputedStyle(element);
  if (transform === "none") return 1;
  return Number(transform.match(/matrix\(([^,]+)/)?.[1] ?? 1);
};

export const TurnsWithTheDirection: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <SearchIcon data-testid="mirrors" />
      <CheckIcon data-testid="stays" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const mirrors = canvasElement.querySelectorAll("svg")[0];
    const stays = canvasElement.querySelectorAll("svg")[1];

    // Direction is a property of the document, so every other story shares it.
    // Restored in `finally`, or a failure here would leave the rest running
    // right-to-left and reporting it as their own.
    const previous = document.documentElement.getAttribute("dir");
    try {
      // Left to right, nothing is flipped.
      stampDirection("ltr");
      await expect(scaleX(mirrors)).toBe(1);
      await expect(scaleX(stays)).toBe(1);

      // Right to left, only the glyph that declared it turns.
      stampDirection("rtl");
      await expect(scaleX(mirrors)).toBe(-1);
      await expect(scaleX(stays)).toBe(1);
    } finally {
      stampDirection(previous);
    }
  },
};

/**
 * The whole set, not a sample of it: an icon that quietly stopped declaring it
 * turns, or one that started, is invisible in a two-glyph check.
 */
export const EveryGlyphTurnsOrStays: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
      {[...TURNS, ...STAYS].map(([name, Icon]) => (
        <span key={name} data-glyph={name}>
          <Icon />
        </span>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const glyph = (name: string) =>
      canvasElement.querySelector<SVGElement>(`[data-glyph="${name}"] svg`)!;

    const previous = document.documentElement.getAttribute("dir");
    try {
      stampDirection("ltr");
      for (const [name] of [...TURNS, ...STAYS])
        await expect(scaleX(glyph(name))).toBe(1);

      stampDirection("rtl");
      for (const [name] of TURNS) await expect(scaleX(glyph(name))).toBe(-1);
      for (const [name] of STAYS) await expect(scaleX(glyph(name))).toBe(1);
    } finally {
      stampDirection(previous);
    }
  },
};
