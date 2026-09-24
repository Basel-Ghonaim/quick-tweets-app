import { z } from "zod";

const MAX_CHARACTERS = 280;

/**
 * The one body rule posts, comments and replies share, so the three cannot drift
 * apart. `noun` words the refusals; `base` carries a create schema's own message.
 */
export const bodyTextField = (noun: string, base: z.ZodString = z.string()) =>
  base
    // Zod checks in chain order, so trimming first makes the length see what is stored.
    .trim()
    .min(1, `${noun} cannot be empty`)
    .max(MAX_CHARACTERS, `${noun} must be at most ${MAX_CHARACTERS} characters`);
