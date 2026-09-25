import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Tabs, TabLink } from "./Tabs";

const meta = {
  title: "Design System/Navigation/Tabs",
  component: Tabs,
  parameters: {
    layout: "fullscreen",
    // Failing from the start: nothing here was migrated from the bootstrap era,
    // so there is no legacy state for the global `todo` default to tolerate.
    a11y: { test: "error" },
  },
  args: {
    label: "Profile sections",
    children: (
      <>
        <TabLink href="/posts" current>
          Posts
        </TabLink>
        <TabLink href="/followers">Followers</TabLink>
        <TabLink href="/following">Following</TabLink>
      </>
    ),
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A landmark with no name is one more unnamed region on a page with several. */
export const TheSetIsNamed: Story = {
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation");

    await expect(nav).toHaveAccessibleName("Profile sections");
  },
};

/**
 * Addresses, not a control: each is somewhere a reader can arrive at, link to
 * and come back to, so they are links and the current one says `page`.
 */
export const EachTabIsAnAddress: Story = {
  play: async ({ canvasElement }) => {
    const links = within(canvasElement).getAllByRole("link");

    await expect(links).toHaveLength(3);
    // Not the tab pattern: nothing here swaps a panel in place.
    await expect(canvasElement.querySelector('[role="tab"]')).toBeNull();
    await expect(canvasElement.querySelector('[role="tablist"]')).toBeNull();

    for (const link of links)
      await expect(link).toHaveAttribute("href");
  },
};

/** Exactly one, and it is the one the caller named. */
export const OneOfThemIsWhereTheReaderIs: Story = {
  play: async ({ canvasElement }) => {
    const links = within(canvasElement).getAllByRole("link");
    const current = links.filter(
      (link) => link.getAttribute("aria-current") === "page",
    );

    await expect(current).toHaveLength(1);
    await expect(current[0]).toHaveAccessibleName("Posts");

    // `page` rather than `true`: one is the word for a destination, the other
    // for a choice, and these are destinations.
    await expect(links[1]).not.toHaveAttribute("aria-current");
  },
};

/** The mark is drawn from the attribute a reader is told by, so the two cannot
 *  disagree — and it moves when the caller says the reader did. */
export const TheMarkFollowsTheCurrentOne: Story = {
  render: () => (
    <Tabs label="Profile sections">
      <TabLink href="/posts">Posts</TabLink>
      <TabLink href="/followers" current>
        Followers
      </TabLink>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const [posts, followers] = within(canvasElement).getAllByRole("link");

    const marked = (element: Element) =>
      getComputedStyle(element, "::after").content;

    await expect(marked(followers)).not.toBe("none");
    await expect(marked(posts)).toBe("none");
  },
};
