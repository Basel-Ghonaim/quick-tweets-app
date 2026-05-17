/**
 * isPrismaError — duck-typed check for Prisma known request errors.
 *
 * Checks if an error is a Prisma error with a specific error code (e.g., P2002, P2025)
 * without importing Prisma's error class directly. This keeps the utility framework-agnostic
 * and avoids coupling shared code to the Prisma client package.
 *
 * Common codes:
 * - P2002: Unique constraint violation (e.g., duplicate follow, duplicate like)
 * - P2025: Record not found (e.g., delete non-existent record)
 *
 * Usage:
 *   if (isPrismaError(error, "P2002")) { ... }
 *
 * Principle: DRY — single source of truth for Prisma error detection.
 */

export const isPrismaError = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: string }).code === code;
