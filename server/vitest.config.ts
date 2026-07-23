import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    // Integration tests connect to a real Postgres and are opt-in (run via
    // `npm run test:integration`). CI has no database by design, so they are
    // excluded from the default unit run.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    // Inert stand-ins so suites can import modules that touch `config/env`
    // (fail-fast Zod parse at import time); no test connects to a database.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/quick_tweets_test",
      JWT_SECRET: "vitest-only-signing-secret",
      MEDIA_GRANT_SECRET: "vitest-only-grant-secret",
    },
  },
});
