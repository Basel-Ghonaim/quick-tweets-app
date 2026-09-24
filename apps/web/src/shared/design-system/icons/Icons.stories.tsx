import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  UploadIcon,
  TrashIcon,
  XIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  SearchIcon,
  ChevronDownIcon,
  UserIcon,
  CameraIcon,
} from "./components";
import { HeartIcon } from "./components";
import * as everyIcon from "./components";
import type { IconProps } from "./icon.types";

/** Wrapper component so Storybook controls work on a single icon */
const IconPlayground = (props: IconProps & { icon: string }) => {
  const icons: Record<string, React.FC<IconProps>> = {
    Upload: UploadIcon,
    Trash: TrashIcon,
    X: XIcon,
    Check: CheckIcon,
    Eye: EyeIcon,
    EyeOff: EyeOffIcon,
    Search: SearchIcon,
    ChevronDown: ChevronDownIcon,
    User: UserIcon,
    Camera: CameraIcon,
  };

  const Icon = icons[props.icon] ?? UploadIcon;
  return <Icon size={props.size} strokeWidth={props.strokeWidth} />;
};

const meta = {
  title: "Design System/Display/Icons",
  parameters: {
    // An icon inherits colour and has none of its own to gate, but the catalogue
    // that places them is a surface like any other and is held to the same bar.
    a11y: { test: "error" },
  },
  component: IconPlayground,
  tags: ["autodocs"],
  argTypes: {
    icon: {
      control: "select",
      options: ["Upload", "Trash", "X", "Check", "Eye", "EyeOff", "Search", "ChevronDown", "User", "Camera"],
    },
    size: { control: { type: "range", min: 12, max: 64, step: 4 } },
    strokeWidth: { control: { type: "range", min: 1, max: 4, step: 0.5 } },
  },
} satisfies Meta<typeof IconPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    icon: "Upload",
    size: 24,
    strokeWidth: 2,
  },
};

/** All icons displayed in a grid for visual reference */
export const Catalog: Story = {
  args: { icon: "Upload" },
  render: () => {
    const allIcons = [
      { name: "Upload", Icon: UploadIcon },
      { name: "Trash", Icon: TrashIcon },
      { name: "X", Icon: XIcon },
      { name: "Check", Icon: CheckIcon },
      { name: "Eye", Icon: EyeIcon },
      { name: "EyeOff", Icon: EyeOffIcon },
      { name: "Search", Icon: SearchIcon },
      { name: "ChevronDown", Icon: ChevronDownIcon },
      { name: "User", Icon: UserIcon },
      { name: "Camera", Icon: CameraIcon },
    ];

    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "var(--space-6)",
        padding: "var(--space-6)",
      }}>
        {allIcons.map(({ name, Icon }) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Icon size={24} />
            <span style={{ font: "var(--type-body-small)", color: "var(--text-secondary)" }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    );
  },
};

/** Icons at different sizes */
export const Sizes: Story = {
  args: { icon: "Upload" },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
      <UploadIcon size={16} />
      <UploadIcon size={24} />
      <UploadIcon size={32} />
      <UploadIcon size={48} />
    </div>
  ),
};

/**
 * "Liked" is the same glyph, filled by whoever owns the meaning. The design
 * fills it from a consumer's own rule rather than swapping in a second icon,
 * so the set carries no filled twin and the shared contract gains no prop.
 *
 * The rule has to name the icon, not its container: `fill="none"` is a
 * presentation attribute on the glyph, which beats a value inherited from
 * above it and loses to a rule that targets it.
 */
export const AConsumerFillsTheHeart: Story = {
  args: { icon: "Upload" },
  render: () => (
    <>
      <style>{`.story-filled { fill: currentColor; }`}</style>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <span data-glyph="outline">
          <HeartIcon />
        </span>
        <span data-glyph="filled">
          <HeartIcon className="story-filled" />
        </span>
      </div>
    </>
  ),
  play: async ({ canvasElement }) => {
    const fillOf = (name: string) =>
      getComputedStyle(
        canvasElement.querySelector<SVGElement>(`[data-glyph="${name}"] svg`)!,
      ).fill;

    await expect(fillOf("outline")).toBe("none");
    await expect(fillOf("filled")).not.toBe("none");
  },
};

/**
 * Every glyph in the set, taken from the barrel rather than a list, so an icon
 * added later is covered without anyone remembering to add it here.
 *
 * An icon names nothing: a control's accessible name is its text, and a glyph
 * that announced itself would say it twice. Nothing else catches this — a
 * decorative `svg` with no role raises no accessibility violation, so its
 * silence has to be asserted rather than observed.
 */
export const EveryGlyphHidesItself: Story = {
  args: { icon: "Upload" },
  render: () => {
    const all = Object.entries(everyIcon) as Array<
      [string, React.FC<IconProps>]
    >;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {all.map(([name, Icon]) => (
          <span key={name} data-icon={name}>
            <Icon />
          </span>
        ))}
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const glyphs = [...canvasElement.querySelectorAll("svg")];

    // A vacuous pass is the failure mode here: an empty set hides itself.
    await expect(glyphs.length).toBeGreaterThan(30);

    for (const glyph of glyphs)
      await expect(glyph).toHaveAttribute("aria-hidden", "true");
  },
};
