/**
 * Password Reset — the boundary schemas.
 *
 * Two rules govern everything here, and they pull in opposite directions on
 * purpose: validate what a caller can already see about their own input, and
 * never validate what would answer a question the capability refuses to
 * answer.
 */

import { z } from "zod";

import { registerSchema } from "../auth.validator.js";

/**
 * The address is checked for shape, and that discloses nothing: a caller
 * knows what they typed. What it must never do is vary with whether the
 * address belongs to an account — that answer is the service's, and it is
 * the same one in every case (I5).
 *
 * Lowercased and trimmed to match how registration stores it, so a reset for
 * `User@x.test` finds the account created as `user@x.test`.
 */
export const requestResetSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
});

/**
 * Presence only — deliberately not the code's charset or length.
 *
 * Checking the shape here would answer a malformed code with a validation
 * failure and its field errors, making "malformed" tell the caller something
 * "wrong" does not. The shape is checked inside the capability, where every
 * unusable code — never issued, expired, spent, malformed, or simply wrong —
 * collapses into one indistinguishable outcome. Channel Verification's
 * confirm schema is presence-only for exactly this reason, and this endpoint
 * is anonymous, so the reasoning binds harder rather than less.
 */
const submittedCode = z
  .string({ error: "A reset code is required" })
  .min(1, "A reset code is required");

export const confirmResetSchema = z.object({
  code: submittedCode,
});

/**
 * Empty by design, and validated anyway: the address is the position's, so a
 * caller able to supply one would be a mint path behind the wrong limiter.
 */
export const resendResetSchema = z.object({
  email: z.never({ error: "The address is not the caller's to supply here." }).optional(),
  code: z.never({ error: "The code is not the caller's to supply here." }).optional(),
});

/**
 * The new password is held to registration's rules by **reusing them**, not
 * by restating them: two copies of a password policy drift, and the copy that
 * drifts is the one nobody is looking at.
 */
export const applyResetSchema = z.object({
  /* Refused rather than stripped: the credential is the session's, and a
     caller able to supply one silently would be a second source for it. */
  code: z.never({ error: "The code is not the caller's to supply here." }).optional(),
  newPassword: registerSchema.shape.password,
});
