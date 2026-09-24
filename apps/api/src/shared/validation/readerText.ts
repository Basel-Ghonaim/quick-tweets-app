import { z } from "zod";

// The embeddings, overrides and isolates: they reorder the words around them. The marks
// (U+200E, U+200F, U+061C) only mark direction, and Arabic text needs them.
const DIRECTION_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/u;

const INVISIBLE_ONLY = /^[\p{White_Space}\p{Default_Ignorable_Code_Point}]*$/u;

/** True when nothing in the text would be seen: white space and default-ignorables alone. */
export const isInvisibleOnly = (text: string) => INVISIBLE_ONLY.test(text);

/**
 * Text other readers will see, made safe to show among their words: stored in NFC,
 * and refused when it carries a direction control. Each field adds its own rules after it.
 */
export const readerTextField = (noun: string, base: z.ZodString = z.string()) =>
  base.normalize("NFC").refine((text) => !DIRECTION_CONTROLS.test(text), {
    message: `${noun} cannot contain text-direction control characters`,
    // A refused text says only why; the checks after it would describe text that will not be kept.
    abort: true,
  });
