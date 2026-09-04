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
 *   3. Stops the background scheduler and awaits any in-flight job
 *   4. Closes the job-lock connection, then disconnects Prisma
 *   5. Exits cleanly
 *
 *   Without this, deployment restarts (Railway, Render, Docker) would
 *   terminate in-flight requests, abandon a running job mid-work, and leak
 *   database connections.
 */

import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./shared/database/index.js";
import { createPostgresJobLock, createScheduler } from "./shared/scheduler/index.js";
import { createRefreshTokenCleanupJob } from "./modules/auth/refreshTokenCleanup.job.js";
import { createMediaReclamationJob } from "./modules/media/reclamation/reclamation.job.js";
import { createChannelVerificationSweepJob } from "./modules/channel-verification/channelVerification.sweep.job.js";
import { createMailSendAttemptSweepJob } from "./modules/mail-delivery/mailSendAttempt.sweep.job.js";
import { createPasswordResetSweepJob } from "./modules/auth/password-reset/passwordReset.sweep.job.js";

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

  // 3. Background jobs — each owned by the module it belongs to; the scheduler
  //    holds no domain knowledge and the registrations below are the whole of
  //    what it knows. A dedicated lock connection gives cross-instance
  //    single-run. Media reclamation is report-only unless explicitly set
  //    destructive; the sweeps are hygiene, and no answer depends on them.
  const jobLock = createPostgresJobLock();
  const scheduler = createScheduler({ lock: jobLock });
  scheduler.register(createRefreshTokenCleanupJob());
  scheduler.register(createMediaReclamationJob());
  scheduler.register(createChannelVerificationSweepJob());
  scheduler.register(createMailSendAttemptSweepJob());
  scheduler.register(createPasswordResetSweepJob());
  scheduler.start();
  console.log("   Background scheduler started");

  // ─── Graceful Shutdown ───────────────────────────────────────────────

  const shutdown = async (signal: string) => {
    console.log(`\n⏳ ${signal} received — shutting down gracefully...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log("   HTTP server closed");
      // Wrapped so a failed teardown step still reaches a deterministic exit
      // rather than surfacing as an unhandled rejection from this async callback.
      try {
        // Stop the scheduler and await any in-flight job *before* disconnecting,
        // so a running job's DB work — and its lock release — can complete.
        await scheduler.stop();
        console.log("   Scheduler stopped");

        // Close the dedicated lock connection (also releases any held lock),
        // then disconnect Prisma (return connections to pool).
        await jobLock.close();
        await prisma.$disconnect();
        console.log("   Database disconnected");
        console.log("✅ Shutdown complete\n");

        process.exit(0);
      } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
      }
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
