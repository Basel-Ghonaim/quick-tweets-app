import "dotenv/config"; // load server/.env so DATABASE_URL points at the real database
import { defineConfig } from "vitest/config";

/**
 * Integration tests — opt-in, against a **real** Postgres (via the real
 * DATABASE_URL from the environment / .env). Run with `npm run test:integration`.
 * Kept separate from the default unit config because CI has no database.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
  },
});
