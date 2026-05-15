/**
 * Server entry point — starts the Express app with lifecycle management.
 *
 * Purpose:
 * - Verifies database connectivity before accepting requests
 * - Starts listening on the configured PORT
 * - Handles graceful shutdown (SIGTERM, SIGINT)
 *
 * Graceful shutdown:
 *   On SIGTERM/SIGINT, the server:
 *   1. Stops accepting new connections
 *   2. Waits for in-flight requests to complete
 *   3. Disconnects Prisma (returns connection pool to DB)
 *   4. Exits cleanly
 *
 *   Without this, deployment restarts (Railway, Render, Docker) would
 *   terminate in-flight requests and leak database connections.
 */

import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./shared/database/index.js";

// ─── Startup ─────────────────────────────────────────────────────────────────

const start = async () => {
  // 1. Verify database connection before accepting traffic
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }

  // 2. Start HTTP server
  const server = app.listen(env.PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`   Health check: http://localhost:${env.PORT}/health`);
    console.log(`   Environment: ${env.NODE_ENV}\n`);
  });

  // ─── Graceful Shutdown ───────────────────────────────────────────────

  const shutdown = async (signal: string) => {
    console.log(`\n⏳ ${signal} received — shutting down gracefully...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log("   HTTP server closed");

      // Disconnect Prisma (return connections to pool)
      await prisma.$disconnect();
      console.log("   Database disconnected");
      console.log("✅ Shutdown complete\n");

      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long (10s)
    setTimeout(() => {
      console.error("❌ Forced shutdown — timeout exceeded");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start();
