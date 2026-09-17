import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import { setupWorker, type SetupWorkerApi } from "msw/browser";
import type { RequestHandler } from "msw";
import { setupAuthClient } from "../src/shared/api";
import { CATALOGUES, currentCopy } from "../src/shared/copy";
import { setupErrorMessages } from "../src/shared/errors";
import { setupLocalisation } from "../src/shared/localisation";
import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEMES,
  type ThemeName,
} from "../src/shared/design-system";

// What app/bootstrap.ts does for the application, done once for the lane, so
// this lane answers a given response exactly as the component lane does.
setupLocalisation(CATALOGUES);
setupErrorMessages(() => currentCopy().errors);
setupAuthClient(() => null, {
  refreshToken: async () => {
    throw new Error("no session to refresh in this lane");
  },
  onTokenRefreshed: () => {},
  onSessionExpired: () => {},
});

let worker: SetupWorkerApi | undefined;
let starting: Promise<unknown> | undefined;

/**
 * A browser loads its own assets, the dev client and its fonts, so refusing
 * every unhandled request would fail every story. Refuse only the ones that
 * reach the API: there, an unhandled request is a story that forgot to say what
 * the server answers, and passing it through would let a real failed request
 * render a state the story then reports as intended.
 */
const refuseOnlyTheApi: Parameters<SetupWorkerApi["start"]>[0] = {
  quiet: true,
  onUnhandledRequest(request, print) {
    if (new URL(request.url).pathname.startsWith("/api/")) print.error();
  },
};

const mswLoader = async (context: {
  parameters: { msw?: { handlers?: RequestHandler[] } };
}) => {
  worker ??= setupWorker();
  starting ??= worker.start(refuseOnlyTheApi);
  await starting;

  worker.resetHandlers();
  const handlers = context.parameters.msw?.handlers ?? [];
  if (handlers.length) worker.use(...handlers);
};

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    viewport: {
      options: {
        phone: { name: "Phone", styles: { width: "390px", height: "844px" }, type: "mobile" },
        tablet: { name: "Tablet", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        laptop: { name: "Laptop", styles: { width: "1280px", height: "800px" }, type: "desktop" },
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
