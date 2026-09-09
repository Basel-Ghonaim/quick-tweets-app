import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { ThemeProvider } from "@shared/preferences";
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../session";
import { AuthLayout } from "./AuthLayout";
import { useAuthNavigate } from "@shared/routing";
import { AUTH_COPY } from "../config/copy";

/* Storybook mounts no application stylesheet, so a story that does not paint the
   ground is judged against the browser's white. */
const onTheGround = (Story: () => React.ReactElement) => (
  <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
    <Story />
  </div>
);

const meta = {
  title: "Auth/Layout",
  component: AuthLayout,
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  decorators: [onTheGround],
} satisfies Meta<typeof AuthLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A body that reports where it is, so a navigation is observable. */
const Body = () => {
  const navigate = useAuthNavigate();
  const { pathname, search } = useLocation();

  return (
    <div style={{ color: "var(--text-primary)" }}>
      <p data-testid="where">{pathname + search}</p>
      <button type="button" onClick={() => navigate("/auth/signup")}>
        onward
      </button>
    </div>
  );
};

/* Composed from the module's own reducer: a feature may not import the
   composition root's store. */
const store = configureStore({ reducer: { auth: authReducer } });

const at = (entry: string) => (Story: () => React.ReactElement) => (
  <Provider store={store}>
    <ThemeProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="signin" element={<Body />} />
            <Route path="signup" element={<Body />} />
          </Route>
          <Route path="*" element={<Story />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  </Provider>
);
export const TheShellHoldsStill: Story = {
  decorators: [at("/auth/signin")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText(AUTH_COPY.brand.markLabel)).toBeInTheDocument();
    await expect(canvas.getByText(AUTH_COPY.brand.headlineLine2)).toBeInTheDocument();
    await expect(canvas.getByText(AUTH_COPY.brand.tagline)).toBeInTheDocument();
  },
};

/** The body here renders no signature of its own, so finding one is the card
 *  carrying it. */
export const TheCardSignsItself: Story = {
  decorators: [at("/auth/signin")],
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector("main > div:last-of-type");

    await expect(
      within(card as HTMLElement).getByText(AUTH_COPY.brand.markLabel),
    ).toBeVisible();
  },
};

/** A stable name with `aria-pressed`: the authoring practice treats a changing
 *  name and a pressed state as alternatives, never as partners. */
export const TheThemeIsSwitchableFromTheShell: Story = {
  decorators: [at("/auth/signin")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: AUTH_COPY.brand.themeToggle });

    const before = document.documentElement.getAttribute("data-theme");
    await userEvent.click(toggle);

    await waitFor(() =>
      expect(document.documentElement.getAttribute("data-theme")).not.toBe(before),
    );

    // The name did not move with the state.
    await expect(canvas.getByRole("button", { name: AUTH_COPY.brand.themeToggle })).toBeInTheDocument();

    // The theme is on the document, so leaving it flipped would reach the next story.
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(document.documentElement.getAttribute("data-theme")).toBe(before),
    );
  },
};

/**
 * At a phone width the sample posts and the blurred feed go, and the form
 * leads. Storybook's viewport resizes the real viewport rather than a wrapper,
 * so the media queries this asserts are the ones a reader gets.
 */
export const TheCompactSetLeadsWithTheForm: Story = {
  decorators: [at("/auth/signin")],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(window.innerWidth).toBeLessThan(576);

    // Present in the markup, absent from the page: what the compact set drops.
    await expect(canvas.getByText(AUTH_COPY.brand.tagline)).toBeVisible();
    await expect(canvas.getByTestId("brand-posts")).not.toBeVisible();
    await expect(canvas.getByTestId("feed-texture")).not.toBeVisible();

    // The form is above the pitch, not beside it.
    const card = canvas.getByTestId("where").closest("div");
    const pitch = canvas.getByText(AUTH_COPY.brand.tagline);
    await expect(
      card!.getBoundingClientRect().top < pitch.getBoundingClientRect().top,
    ).toBe(true);
  },
};

/** The same shell at a laptop width keeps both columns. */
export const TheTwoColumnsHoldAtLaptopWidth: Story = {
  decorators: [at("/auth/signin")],
  globals: { viewport: { value: "laptop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId("brand-posts")).toBeVisible();
    await expect(canvas.getByTestId("feed-texture")).toBeVisible();
  },
};
