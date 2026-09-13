import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Renders leak into the next test without this, and the lane's whole point is
// that one mount's lifecycle is observable on its own.
afterEach(cleanup);
