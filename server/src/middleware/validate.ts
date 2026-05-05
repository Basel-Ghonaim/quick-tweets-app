/**
 * Zod validation middleware — generic request validator.
 *
 * Current purpose:
 * - Validates req.body against a provided Zod schema
 * - Rejects invalid requests with 400 + field-level error details
 * - Replaces req.body with parsed (typed, trimmed) data on success
 *
 * Future expansion:
 * - Validate req.params and req.query in addition to body
 * - Add support for multipart form data validation (post-Multer)
 *
 * Principle: SRP — only validates, no business logic.
 * Principle: OCP — works with any Zod schema, no modification needed per endpoint.
 */

import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "../shared/errors/index.js";

/**
 * Creates a middleware that validates req.body against the given Zod schema.
 *
 * On success: replaces req.body with parsed (type-safe) data → calls next().
 * On failure: throws AppError.validation(400) with field-level errors.
 *
 * Usage in routes:
 *   router.post("/register", validate(registerSchema), controller.register);
 *
 * @param schema - A Zod schema to validate against
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Parse and replace body with validated, typed data
      req.body = schema.parse(req.body);
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
