/**
 * Zod validation middleware — generic request validator.
 *
 * Current purpose:
 * - Validates req.body or req.query against a provided Zod schema
 * - Rejects invalid requests with 400 + field-level error details
 * - Replaces the source with parsed (typed, trimmed) data on success
 *
 * Principle: SRP — only validates, no business logic.
 * Principle: OCP — works with any Zod schema, no modification needed per endpoint.
 */

import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "../shared/errors/index.js";

/**
 * Creates a middleware that validates a request source against the given Zod schema.
 *
 * On success: replaces the source with parsed (type-safe) data → calls next().
 * On failure: throws AppError.validation(400) with field-level errors.
 *
 * Usage in routes:
 *   router.post("/tweets", validate(createTweetSchema), controller.create);          // body (default)
 *   router.get("/tweets", validate(cursorQuerySchema, "query"), controller.getFeed);  // query
 *
 * @param schema - A Zod schema to validate against
 * @param source - Which part of the request to validate: "body" (default) or "query"
 */
export const validate = (schema: ZodSchema, source: "body" | "query" = "body") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Parse and replace source with validated, typed data
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Transform Zod errors into field → messages map
        const fieldErrors: Record<string, string[]> = {};

        for (const issue of err.issues) {
          const field = issue.path.join(".");
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(issue.message);
        }

        throw AppError.validation("Validation failed", fieldErrors);
      }
      // Re-throw non-Zod errors (will be caught by errorHandler)
      throw err;
    }
  };
};
