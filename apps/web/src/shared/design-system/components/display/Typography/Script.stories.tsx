import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { Typography } from "./Typography";

/** One word, so every glyph in it is Arabic: a space would be drawn by whichever face leads. */
const ARABIC_WORD = "المُستَفيدونَ";

const ARABIC_FACE = '400 14px "Noto Sans Arabic"';

/** A browser fetches a face's Arabic range only for glyphs it lays out in it, so this file
 *  renders no other Arabic: a story before this one would have fetched the face already. */
const meta = {
  title: "Design System/Display/Typography Script",
  parameters: { a11y: { test: "error" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Arabic is drawn by the Arabic face in any document, including one whose Latin face leads. */
export const ArabicIsDrawnByItsOwnFace: Story = {
  render: () => (
    <Typography variant="body-medium" as="span" data-case="arabic">
      {ARABIC_WORD}
    </Typography>
  ),
  play: async ({ canvasElement }) => {
    const arabic = canvasElement.querySelector<HTMLElement>("[data-case=arabic]")!;
    const arabicRange = () =>
      [...document.fonts].filter(
        (face) => face.family.replace(/"/g, "") === "Noto Sans Arabic" &&
          face.unicodeRange.includes("U+600-6FF"),
      );

    // The faces are declared by a stylesheet served from the network, which may arrive after
    // the story renders; none declared by the deadline means the lane could not reach them.
    await waitFor(() => expect(arabicRange().length).toBeGreaterThan(0), { timeout: 10_000 });
    arabic.getBoundingClientRect();
    await document.fonts.ready;
    await waitFor(
      () => expect(arabicRange().some((face) => face.status === "loaded")).toBe(true),
      { timeout: 10_000 },
    );

    // Measured without laying out a second Arabic element, which would fetch the face itself.
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = ARABIC_FACE;
    await expect(arabic.getBoundingClientRect().width).toBeCloseTo(
      context.measureText(ARABIC_WORD).width,
      1,
    );
  },
};
