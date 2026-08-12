import { z } from "zod";

/**
 * Presence only — deliberately not the code's charset or length.
 *
 * Rejecting a malformed code here would answer it with a validation failure and
 * its field errors, making "malformed" tell the caller something "wrong" does
 * not. Shape is checked inside the capability, where every failed confirmation
 * collapses into one indistinguishable outcome. The login identifier's schema
 * is presence-only for the same reason.
 */
export const confirmChallengeSchema = z.object({
  code: z
    .string({ error: "A verification code is required" })
    .min(1, "A verification code is required"),
});

export type ConfirmChallengeInput = z.infer<typeof confirmChallengeSchema>;
