import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Placeholder } from "./Placeholder";

const meta = {
  title: "App/Placeholder",
  component: Placeholder,
} satisfies Meta<typeof Placeholder>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A surface the product is committed to, standing in until it is built. */
export const NamedSurface: Story = {
  args: { surface: "Feed" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("Feed is not built yet");
    await expect(canvasElement.textContent).not.toContain("nothing at this address");
  },
};

/** No surface was named, so the path matched nothing rather than something late. */
export const UnknownPath: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("nothing at this address");
    await expect(canvasElement.textContent).not.toContain("not built yet");
  },
};
