import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Checkbox } from "../Checkbox";
import { FileInput } from "../FileInput";
import { Input } from "../Input";
import { Textarea } from "../Textarea";
import { THEMES, THEME_ATTRIBUTE } from "../../../foundations";

const SHARED = {
  label: "Field label",
  helperText: "The description every field renders the same way.",
  errorMessage: "The error every field renders the same way.",
  isInvalid: true,
};

const meta = {
  title: "Design System/Fields/Field anatomy",
  parameters: {
    // The lowest gate among the four this compares, so the comparison is not
    // the thing that promotes FileInput's — #517 owns that and is still open.
    a11y: { test: "todo" },
  },
} satisfies Meta;

export default meta;

/**
 * What four copies of one rule can silently lose.
 *
 * The fields render their description and their error through one shared part,
 * and the point of that is not fewer lines — it is that the four cannot drift
 * apart. Asserted by comparison rather than against fixed values, so the
 * invariant survives a change to what the values are.
 *
 * Checkbox is in here deliberately: its label is shaped differently and stays
 * its own, but its messages are the shared ones, and this is what says so.
 */
export const EveryFieldSpeaksTheSame: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: "1.5rem", width: "26rem" }}>
      <div data-field="input">
        <Input {...SHARED} fullWidth />
      </div>
      <div data-field="textarea">
        <Textarea {...SHARED} fullWidth />
      </div>
      <div data-field="checkbox">
        <Checkbox {...SHARED} />
      </div>
      <div data-field="file-input">
        <FileInput {...SHARED} name="file" variant="standard" fullWidth />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const previous = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const fields = ["input", "textarea", "checkbox", "file-input"];

    const readOne = (name: string) => {
      const scope = canvasElement.querySelector<HTMLElement>(
        `[data-field="${name}"]`,
      )!;
      const error = scope.querySelector<HTMLElement>('[role="alert"]')!;
      // Found through the control's own wiring rather than a class name, so the
      // assertion does not depend on how the shared part is implemented.
      const control = scope.querySelector<HTMLElement>("[aria-describedby]")!;
      const helperId = control
        .getAttribute("aria-describedby")!
        .split(" ")
        .find((id) => id !== error.id);
      const helper = helperId
        ? canvasElement.querySelector<HTMLElement>(`#${CSS.escape(helperId)}`)
        : null;
      return { error, helper, control };
    };

    for (const theme of THEMES) {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

      const read = fields.map(readOne);
      const [reference] = read;
      const referenceError = getComputedStyle(reference.error);

      for (const { error, helper, control } of read) {
        // The error reads identically everywhere, in both themes.
        const style = getComputedStyle(error);
        await expect(style.font).toBe(referenceError.font);
        await expect(style.color).toBe(referenceError.color);

        // And it is still announced, and still associated with its control.
        await expect(error.getAttribute("role")).toBe("alert");
        await expect(control.getAttribute("aria-describedby")).toContain(
          error.id,
        );

        // FileInput drops its description while an error stands; the other
        // three keep theirs, and where one exists it matches the others.
        if (helper) {
          const helperStyle = getComputedStyle(helper);
          const referenceHelper = read.find((f) => f.helper)!.helper!;
          await expect(helperStyle.font).toBe(
            getComputedStyle(referenceHelper).font,
          );
          await expect(helperStyle.color).toBe(
            getComputedStyle(referenceHelper).color,
          );
        }
      }
    }

    if (previous)
      document.documentElement.setAttribute(THEME_ATTRIBUTE, previous);
  },
};
