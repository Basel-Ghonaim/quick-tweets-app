/**
 * Prisma Config — Database connection & CLI configuration for Prisma v7.
 *
 * Current purpose:
 * - Provides the DATABASE_URL to Prisma CLI for migrations and introspection
 * - Points to the schema.prisma file location
 * - Defines migration output directory
 *
 * Future expansion:
 * - Add seed script configuration
 * - Add shadow database URL for migration testing
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});
