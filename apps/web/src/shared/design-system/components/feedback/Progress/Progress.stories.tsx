import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ROLES } from "../../../foundations";
import { Progress } from "./Progress";
import { RING_RADIUS } from "./geometry";

const WHOLE = 2 * Math.PI * RING_RADIUS;
/** The computed value carries units, so it is parsed rather than cast. */
const drawn = (element: SVGCircleElement) =>
  parseFloat(getComputedStyle(element).strokeDasharray.split(/[,\s]+/)[0]);

const meta = {
  title: "Design System/Feedback/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  argTypes: {
    color: { control: "select", options: [...ROLES] },
    shape: { control: "select", options: ["linear", "ring"] },
  },
  args: { value: 140, max: 280, shape: "linear" },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Linear: Story = { args: { style: { inlineSize: 240 } } };

export const Ring: Story = { args: { shape: "ring" } };

/** The composer draws the ring as characters are used, and colours it by how
 *  close the limit is — the colour is the caller's, the fraction is not. */
export const Roles: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      {ROLES.map((role) => (
        <Progress key={role} shape="ring" value={200} max={280} color={role} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const fills = [...canvasElement.querySelectorAll<SVGCircleElement>("circle")]
      .filter((_, index) => index % 2 === 1)
      .map((circle) => getComputedStyle(circle).stroke);

    await expect(fills).toHaveLength(ROLES.length);
    // Six roles, six colours: a fill that ignored the role would give one.
    await expect(new Set(fills).size).toBe(ROLES.length);
  },
};

/** Read from what was painted, not from the value handed in. */
export const TheRingTracksTheFraction: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <span data-at="none">
        <Progress shape="ring" value={0} max={280} />
      </span>
      <span data-at="half">
        <Progress shape="ring" value={140} max={280} />
      </span>
      <span data-at="all">
        <Progress shape="ring" value={280} max={280} />
      </span>
      <span data-at="over">
        <Progress shape="ring" value={400} max={280} />
      </span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const fillAt = (at: string) =>
      canvasElement.querySelector<SVGCircleElement>(
        `[data-at="${at}"] circle:nth-of-type(2)`,
      )!;

    await expect(drawn(fillAt("none"))).toBeCloseTo(0, 1);
    await expect(drawn(fillAt("half"))).toBeCloseTo(WHOLE / 2, 0);
    await expect(drawn(fillAt("all"))).toBeCloseTo(WHOLE, 0);

    // Overrunning is the consumer's to word; the circle cannot mean more.
    await expect(drawn(fillAt("over"))).toBeCloseTo(WHOLE, 0);
  },
};

/**
 * A quarter drawn from three o'clock is the same length of arc as a quarter
 * drawn from the top, so the length proves nothing about where it began. The
 * box is turned a quarter turn back, and only the matrix shows it.
 */
export const TheRingFillsFromTheTop: Story = {
  args: { shape: "ring", value: 70, max: 280 },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector<SVGElement>("svg")!;
    const { transform } = getComputedStyle(box);

    await expect(transform).not.toBe("none");

    // A quarter turn anticlockwise: cos(-90) = 0, sin(-90) = -1.
    const [a, b] = transform
      .slice(transform.indexOf("(") + 1, -1)
      .split(",")
      .map((part) => Number(part.trim()));

    await expect(a).toBeCloseTo(0, 5);
    await expect(b).toBeCloseTo(-1, 5);
  },
};

export const TheBarTracksTheFraction: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <span data-at="quarter" style={{ inlineSize: 200 }}>
        <Progress value={70} max={280} style={{ inlineSize: 200 }} />
      </span>
      <span data-at="over" style={{ inlineSize: 200 }}>
        <Progress value={400} max={280} style={{ inlineSize: 200 }} />
      </span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const barAt = (at: string) =>
      canvasElement
        .querySelector<HTMLElement>(`[data-at="${at}"] > span > span`)!
        .getBoundingClientRect().width;

    await expect(barAt("quarter")).toBeCloseTo(50, 0);
    // Clamped: the track is 200, and a quarter over does not spill past it.
    await expect(barAt("over")).toBeCloseTo(200, 0);
  },
};

/** A fraction says neither what it measures nor whether it matters, so the
 *  surface that knows both is the one that speaks. */
export const ItAnnouncesNothing: Story = {
  render: () => (
    <div role="status" aria-label="Uploading, 40 percent done">
      <Progress value={40} max={100} style={{ inlineSize: 200 }} />
      <Progress shape="ring" value={40} max={100} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const roots = [...canvasElement.querySelectorAll('[aria-hidden="true"]')];

    // A vacuous pass is the failure here: an empty set announces nothing too.
    await expect(roots.length).toBeGreaterThanOrEqual(2);
    await expect(canvasElement.querySelector("[role=progressbar]")).toBeNull();
    await expect(
      canvasElement.querySelector('[role="status"]'),
    ).toHaveAccessibleName("Uploading, 40 percent done");
  },
};
