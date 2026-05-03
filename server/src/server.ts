/**
 * Server entry point — starts the Express app.
 *
 * Current purpose:
 * - Imports the configured Express app
 * - Starts listening on the configured PORT
 * - Logs startup confirmation
 *
 * Future expansion:
 * - Initialize Prisma client connection
 * - Graceful shutdown handling (SIGTERM, SIGINT)
 * - Startup health checks (DB connection, external services)
 */

import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`   Health check: http://localhost:${env.PORT}/health\n`);
});
