import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { currentCopy } from "@shared/copy";
import { Placeholder } from "./Placeholder";

const meta = {
  title: "App/Placeholder",
  component: Placeholder,
} satisfies Meta<typeof Placeholder>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A surface the product is committed to, standing in until it is built. */
export const NamedSurface: Story = {
  args: { surface: "feed" },
  play: async ({ canvasElement }) => {
    const { notBuiltTitle, unknownTitle } = currentCopy().placeholder;
    await expect(canvasElement.textContent).toContain(notBuiltTitle.feed);
    await expect(canvasElement.textContent).not.toContain(unknownTitle);
  },
};

/** No surface was named, so the path matched nothing rather than something late. */
export const UnknownPath: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const { notBuiltTitle, unknownTitle } = currentCopy().placeholder;
    await expect(canvasElement.textContent).toContain(unknownTitle);
    for (const title of Object.values(notBuiltTitle))
      await expect(canvasElement.textContent).not.toContain(title);
  },
};
