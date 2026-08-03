import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEMES,
  type ThemeName,
} from "../src/shared/design-system";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  globalTypes: {
    theme: {
      description: "Design System theme",
      defaultValue: DEFAULT_THEME,
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: THEMES.map((name) => ({ value: name, title: name })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as ThemeName) ?? DEFAULT_THEME;
      useEffect(() => {
        document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      }, [theme]);
      return Story();
    },
  ],
};

export default preview;
