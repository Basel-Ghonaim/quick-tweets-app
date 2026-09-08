/** Crockford base32, which drops I, L, O and U so a hand-typed code cannot be
 *  ambiguous. The server accepts only these characters, at an exact length. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Three of the four dropped letters have a digit they are mistaken for; U has
 *  none, so it is simply not accepted. */
const CONFUSABLE: Record<string, string> = { I: "1", L: "1", O: "0" };

/**
 * The server normalises nothing and every rejection is the same message, so a
 * code typed in lower case would come back indistinguishable from a wrong one.
 */
export const normaliseCode = (raw: string): string =>
  [...raw.toUpperCase()]
    .map((character) => CONFUSABLE[character] ?? character)
    .filter((character) => ALPHABET.includes(character))
    .join("");
