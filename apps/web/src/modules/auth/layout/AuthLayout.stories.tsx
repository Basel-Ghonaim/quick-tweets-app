import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../store";
import { AuthLayout } from "./AuthLayout";
import { AuthShell } from "../AuthShell";
import { AuthDesignProvider } from "../_design";
import { useAuthNavigate } from "../navigation";
import { AUTH_COPY } from "../config/copy";

/**
 * Storybook mounts no application ground: `app.css` is imported only by the
 * entry point, so a story judged without painting `--surface-page` is judged
 * against the browser's white. That is the blind spot that hid a contrast
 * defect once already, so every story here paints the ground it claims to
 * render on.
 */
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
    <div>
      <p data-testid="where">{pathname + search}</p>
      <button type="button" onClick={() => navigate("/auth/signup")}>
        onward
      </button>
    </div>
  );
};

/**
 * The current design reaches the module's own slice, so rendering that arm needs
 * a store. It is composed here from the module's reducer rather than borrowed
 * from the composition root, which a feature may not import.
 */
const store = configureStore({ reducer: { auth: authReducer } });

const at = (entry: string) => (Story: () => React.ReactElement) => (
  <Provider store={store}>
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route
        path="/auth"
        element={
          <AuthDesignProvider showToggle={false}>
            <AuthShell />
          </AuthDesignProvider>
        }
      >
        <Route path="signin" element={<Body />} />
        <Route path="signup" element={<Body />} />
      </Route>
      <Route path="*" element={<Story />} />
    </Routes>
  </MemoryRouter>
  </Provider>
);

export const TheShellHoldsStill: Story = {
  decorators: [at("/auth/signin?design=proposed")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The brand is announced through the element wrapping the mark, because the
    // mark is decorative by its own contract.
    await expect(canvas.getByLabelText(AUTH_COPY.brand.markLabel)).toBeInTheDocument();
    await expect(canvas.getByText(AUTH_COPY.brand.headlineLine2)).toBeInTheDocument();
    await expect(canvas.getByText(AUTH_COPY.brand.tagline)).toBeInTheDocument();
  },
};

/**
 * The failure this Work Item exists to remove. The mode lives only in the URL,
 * and a bare-path navigation drops it — silently, because an absent parameter
 * and a malformed one both resolve to the current design.
 */
export const TheModeSurvivesANavigation: Story = {
  decorators: [at("/auth/signin?design=proposed")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId("where")).toHaveTextContent("/auth/signin?design=proposed");

    await userEvent.click(canvas.getByRole("button", { name: "onward" }));

    await waitFor(() =>
      expect(canvas.getByTestId("where")).toHaveTextContent("/auth/signup?design=proposed"),
    );

    // Still the proposed shell, which is what the parameter decides.
    await expect(canvas.getByLabelText(AUTH_COPY.brand.markLabel)).toBeInTheDocument();
  },
};

/** Without the parameter the current design renders, and the shell is absent. */
export const TheCurrentDesignIsTheDefault: Story = {
  decorators: [at("/auth/signin")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByLabelText(AUTH_COPY.brand.markLabel)).not.toBeInTheDocument();
  },
};
