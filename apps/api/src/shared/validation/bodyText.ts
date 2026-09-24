import { z } from "zod";

import { isInvisibleOnly, readerTextField } from "./readerText.js";

const MAX_CHARACTERS = 280;

// A character is a code point, as the design's counter counts; `.length` would count an emoji twice.
const codePoints = (text: string) => Array.from(text).length;

/**
 * The one body rule posts, comments and replies share, so the three cannot drift
 * apart. `noun` words the refusals; `base` carries a create schema's own message.
 */
export const bodyTextField = (noun: string, base: z.ZodString = z.string()) =>
  readerTextField(noun, base)
    // Zod checks in chain order, so trimming first makes the length see what is stored.
    .trim()
    .refine((text) => !isInvisibleOnly(text), `${noun} cannot be empty`)
    .refine(
      (text) => codePoints(text) <= MAX_CHARACTERS,
      `${noun} must be at most ${MAX_CHARACTERS} characters`,
    );
