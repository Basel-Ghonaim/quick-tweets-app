import { createRoot } from "react-dom/client";

import { App } from "./app/routes/App";

import { Provider as ReduxProvider } from "react-redux";

import { reduxStore } from "@app/store";
import { bootstrap } from "@app/bootstrap";
import { applyTheme } from "@app/theme";

import "./shared/design-system";

// Wire shared infrastructure (authClient) with app-layer dependencies (Redux)
bootstrap();
applyTheme();

createRoot(document.getElementById("root")!).render(
  <ReduxProvider store={reduxStore}>
    <App />
  </ReduxProvider>,
);
