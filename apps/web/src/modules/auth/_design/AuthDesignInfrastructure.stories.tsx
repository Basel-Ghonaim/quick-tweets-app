import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthDesignProvider } from "./AuthDesignProvider";
import { useAuthDesignMode } from "./useAuthDesignMode";

/**
 * Verification for the temporary design-comparison infrastructure, running in a
 * real browser against the real router.
 *
 * It lives inside `_design/` so it is deleted with everything else it covers,
 * and it never appears in the auth UI.
 */

/** Reports the router's own view of the URL, so assertions read what it holds. */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="search">{location.search || "(none)"}</output>;
};

/**
 * Increments once per mount. A lazy state initialiser runs exactly when the
 * component mounts and never on re-render, which makes the identity below a
 * reliable remount detector — and unlike a ref, it is safe to read while
 * rendering.
 */
let mountSequence = 0;

/**
 * Stands in for a Design Unit boundary: it reads the mode, and it holds state.
 *
 * The mount identity is the point. Switching designs must re-render without
 * remounting, because a remount would reset form values, validation and loading
 * state — and a comparison that resets the experience is not a comparison.
 */
const BoundaryProbe = () => {
  const { mode } = useAuthDesignMode();
  const [draft, setDraft] = useState("");
  const [mountId] = useState(() => ++mountSequence);

  return (
    <div>
      <output data-testid="mode">{mode}</output>
      <output data-testid="mount-id">{mountId}</output>
      <input
        aria-label="draft"
        data-testid="draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <p data-testid="rendered">{mode === "proposed" ? "PROPOSED TREE" : "BOOTSTRAP TREE"}</p>
    </div>
  );
};

const Harness = ({ initialEntry }: { initialEntry: string }) => (
  <MemoryRouter initialEntries={[initialEntry]}>
    <AuthDesignProvider showToggle>
      <LocationProbe />
      <BoundaryProbe />
    </AuthDesignProvider>
  </MemoryRouter>
);

const meta = {
  title: "Auth/_design/Comparison Infrastructure",
  component: Harness,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No parameter means the shipping design, so unrelated work is unaffected. */
export const DefaultsToBootstrap: Story = {
  args: { initialEntry: "/auth/signin" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("mode")).toHaveTextContent("bootstrap");
    await expect(canvas.getByTestId("rendered")).toHaveTextContent("BOOTSTRAP TREE");
  },
};

/** The URL is the source of truth — this is also what a refresh reproduces. */
export const UrlIsTheSourceOfTruth: Story = {
  args: { initialEntry: "/auth/signin?design=proposed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("mode")).toHaveTextContent("proposed");
    await expect(canvas.getByTestId("rendered")).toHaveTextContent("PROPOSED TREE");
  },
};

/** A mistyped URL shows the working design rather than an error. */
export const UnrecognisedValueFallsBack: Story = {
  args: { initialEntry: "/auth/signin?design=propsed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("mode")).toHaveTextContent("bootstrap");
  },
};

/** The toggle switches the mode and writes it to the URL. */
export const ToggleSwitchesAndWritesTheUrl: Story = {
  args: { initialEntry: "/auth/signin" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId("mode")).toHaveTextContent("bootstrap");

    await userEvent.click(canvas.getByTestId("auth-design-switch"));
    await expect(canvas.getByTestId("mode")).toHaveTextContent("proposed");
    await expect(canvas.getByTestId("search")).toHaveTextContent("design=proposed");

    await userEvent.click(canvas.getByTestId("auth-design-switch"));
    await expect(canvas.getByTestId("mode")).toHaveTextContent("bootstrap");
    await expect(canvas.getByTestId("search")).toHaveTextContent("design=bootstrap");
  },
};

/** Switching must not drop the other query parameters the route may carry. */
export const OtherQueryParametersSurvive: Story = {
  args: { initialEntry: "/auth/signin?redirect=%2Ffeed&ref=email" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId("auth-design-switch"));

    const search = canvas.getByTestId("search");
    await expect(search).toHaveTextContent("design=proposed");
    await expect(search).toHaveTextContent("redirect=%2Ffeed");
    await expect(search).toHaveTextContent("ref=email");
  },
};

/**
 * The requirement the whole comparison rests on: switching preserves what the
 * user had typed, and does not remount the tree that held it.
 */
export const SwitchingPreservesState: Story = {
  args: { initialEntry: "/auth/signin" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByTestId("draft"), "basel.g");
    await expect(canvas.getByTestId("draft")).toHaveValue("basel.g");

    const mountIdBefore = canvas.getByTestId("mount-id").textContent;

    await userEvent.click(canvas.getByTestId("auth-design-switch"));

    await expect(canvas.getByTestId("mode")).toHaveTextContent("proposed");
    // What the user typed survives the switch...
    await expect(canvas.getByTestId("draft")).toHaveValue("basel.g");
    // ...because the tree re-rendered rather than remounting.
    await expect(canvas.getByTestId("mount-id").textContent).toBe(mountIdBefore);
  },
};

/**
 * Two tabs hold different modes only because nothing is persisted: a stored
 * value would be shared, and both tabs would converge on it. This asserts the
 * mechanism rather than the symptom, since a test cannot open a second tab.
 */
export const NothingIsPersistedToStorage: Story = {
  args: { initialEntry: "/auth/signin" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const snapshot = () =>
      JSON.stringify([{ ...window.localStorage }, { ...window.sessionStorage }]);

    const before = snapshot();

    await userEvent.click(canvas.getByTestId("auth-design-switch"));
    await expect(canvas.getByTestId("mode")).toHaveTextContent("proposed");

    await expect(snapshot()).toBe(before);
  },
};

/** The control never ships: it is gated on the development build. */
export const ToggleIsHiddenOutsideDevelopment: Story = {
  args: { initialEntry: "/auth/signin" },
  render: ({ initialEntry }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthDesignProvider showToggle={false}>
        <BoundaryProbe />
      </AuthDesignProvider>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId("auth-design-toggle")).toBeNull();
    await expect(canvas.getByTestId("mode")).toHaveTextContent("bootstrap");
  },
};
