import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandMark } from "./BrandMark";

const meta = {
  title: "Brand/BrandMark",
  component: BrandMark,
  parameters: { layout: "centered" },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      {[15, 32, 52].map((size) => (
        <BrandMark key={size} size={size} />
      ))}
    </div>
  ),
};

/**
 * The mark takes the colour of the text around it, which is what lets one glyph
 * serve a brand bar, a card signature and a watermark without any of them
 * handing it a value.
 */
export const TakesTheColorAroundIt: Story = {
  render: () => (
    <>
      <div style={{ color: "rgb(0, 128, 0)" }}>
        <BrandMark />
      </div>
      <div style={{ color: "rgb(128, 0, 128)" }}>
        <BrandMark />
      </div>
    </>
  ),
  play: async ({ canvasElement }) => {
    const [first, second] = canvasElement.querySelectorAll("svg");

    await expect(getComputedStyle(first).fill).toBe("rgb(0, 128, 0)");
    await expect(getComputedStyle(second).fill).toBe("rgb(128, 0, 128)");
  },
};
