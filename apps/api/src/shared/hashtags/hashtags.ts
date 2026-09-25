/**
 * What a hashtag is, and when two are the same. One rule for every reader of it:
 * the post that stores its hashtags, the trend that counts them and the search that finds them.
 */

/** A hashtag as a post carries it: the key it is compared by, and how the post spelled it. */
export interface Hashtag {
  key: string;
  spelling: string;
}

// The approved design's pattern. A web address is matched first, so a `#` inside one is never a hashtag.
const SEGMENTS = /(https?:\/\/[^\s]+)|((?<![\p{L}\p{N}_])#[\p{L}\p{M}\p{N}_]+)/gu;

const ARABIC_BLOCK = { first: 0x0600, last: 0x06ff };
const TATWEEL = 0x0640;
const ALEF = String.fromCodePoint(0x0627);
const ALEF_FORMS = new Set([0x0622, 0x0623, 0x0625, 0x0671]); // آ أ إ ٱ

const inArabicBlock = (mark: string) => {
  const cp = mark.codePointAt(0)!;
  return cp >= ARABIC_BLOCK.first && cp <= ARABIC_BLOCK.last;
};

// Lowering alone leaves ẞ, ß and a final sigma apart from their other cases; this is stable over them all.
const foldCase = (text: string) => text.toLowerCase().toUpperCase().toLowerCase();

/**
 * The key two hashtags are compared by, from a tag without its `#`. Marks are dropped after NFC,
 * so the hamza that composes ؤ and ئ is part of the letter and stays.
 */
export const hashtagKey = (tag: string): string =>
  foldCase(
    Array.from(tag.normalize("NFC").replace(/\p{Mn}/gu, (mark) => (inArabicBlock(mark) ? "" : mark)))
      .filter((ch) => ch.codePointAt(0) !== TATWEEL)
      .map((ch) => (ALEF_FORMS.has(ch.codePointAt(0)!) ? ALEF : ch))
      .join(""),
  ).normalize("NFC");

/**
 * The hashtags in a text, once each by key, in the order they first appear and as first spelled.
 * Read the text as stored: normalising can move where a hashtag begins.
 */
export const hashtagsOf = (text: string): Hashtag[] => {
  const byKey = new Map<string, Hashtag>();
  for (const match of text.matchAll(SEGMENTS)) {
    const tag = match[2];
    if (tag === undefined) continue;
    const spelling = tag.slice(1);
    const key = hashtagKey(spelling);
    if (key !== "" && !byKey.has(key)) byKey.set(key, { key, spelling });
  }
  return [...byKey.values()];
};
