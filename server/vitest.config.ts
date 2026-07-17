import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    // Inert stand-ins so suites can import modules that touch `config/env`
    // (fail-fast Zod parse at import time); no test connects to a database.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/quick_tweets_test",
      JWT_SECRET: "vitest-only-signing-secret",
    },
  },
});
