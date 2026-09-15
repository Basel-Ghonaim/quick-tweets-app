import { setupServer } from "msw/node";

/**
 * The component lane's server. Its lifecycle is the lane's, not a test's, and
 * lives in `vitest.component.setup.ts`; a test only declares handlers with
 * `server.use(...)`.
 */
export const server = setupServer();
