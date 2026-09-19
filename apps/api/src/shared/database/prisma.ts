/**
 * Prisma Client singleton — shared database connection for the entire backend.
 *
 * Purpose:
 * - Creates a single PrismaClient instance with the PrismaPg adapter
 * - Provides type-safe access to all database models (User, RefreshToken)
 * - Ensures one connection pool is reused across all modules
 *
 * Principle: SRP — this file only manages the database connection.
 * Principle: DIP — modules import this singleton, not Prisma directly.
 */

import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({ adapter });
