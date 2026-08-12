import type { Meta, StoryObj } from "@storybook/react-vite";
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
