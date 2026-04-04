import { createRoot } from "react-dom/client";

import { App } from "./app/routes/App";

import { Provider as ReduxProvider } from "react-redux";
import { reduxStore } from "./app/store/store";

import "./shared/design-system";

createRoot(document.getElementById("root")!).render(
  <ReduxProvider store={reduxStore}>
    <App />
  </ReduxProvider>,
);
