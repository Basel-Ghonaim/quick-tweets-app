import { createRoot } from "react-dom/client";

import { App } from "./app/routes/App";
import { AppProviders } from "@app/providers";
import { bootstrap } from "@app/bootstrap";

import "./shared/design-system";
import "./app/app.css";

// Wire shared infrastructure (authClient) with app-layer dependencies (Redux)
bootstrap();

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>,
);
