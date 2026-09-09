import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MessageRegion } from "./MessageRegion";

/**
 * Admitted as an interim standing in for `Alert`, which the product has
 * committed to and which does not exist. What it does not yet meet of this
 * layer's authoring conventions is recorded in Finding 0024.
 */
const meta = {
  title: "Design System/Feedback/MessageRegion",
  parameters: { a11y: { test: "error" } },
  component: MessageRegion,
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "inline-radio", options: ["error", "info"] },
  },
  args: { tone: "error", children: "That reset code is not valid." },
} satisfies Meta<typeof MessageRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const BOTH_TONES = (
  <div style={{ display: "grid", gap: "var(--space-3)" }}>
    <MessageRegion tone="error">That reset code is not valid.</MessageRegion>
    <MessageRegion tone="info">
      If an account exists for that address, a code is on its way.
    </MessageRegion>
  </div>
);

/**
 * A failure interrupts and a confirmation waits its turn, so the two tones map
 * to different live regions. Nothing else observes that mapping: it is a
 * runtime attribute, so neither the types nor any check can see it, and a tone
 * silently downgraded to `status` would still render correctly.
 */
export const Tones: Story = {
  render: () => BOTH_TONES,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "That reset code is not valid.",
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "If an account exists for that address",
    );
  },
};

/**
 * Its fill is a tenth-alpha wash, so what a reader sees is the wash composited
 * over whatever sits behind it — a pair `tokenContrast` compares token against
 * token and therefore cannot measure (Finding 0022). Both grounds are rendered
 * because that finding measures both, and the rendered accessibility run is
 * what asserts them.
 */
const onBothGrounds = () => (
  <div style={{ display: "grid", gap: "var(--space-5)" }}>
    <div style={{ background: "var(--surface-page)", padding: "var(--space-4)" }}>
      {BOTH_TONES}
    </div>
    <div
      style={{ background: "var(--surface-default)", padding: "var(--space-4)" }}
    >
      {BOTH_TONES}
    </div>
  </div>
);

export const OnBothGrounds: Story = { render: onBothGrounds };

/** The same pairs in the other resolution, where the composite differs again. */
export const OnBothGroundsDark: Story = {
  render: onBothGrounds,
  globals: { theme: "dark" },
};
