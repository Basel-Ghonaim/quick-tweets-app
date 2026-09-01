/**
 * Every string the auth experience shows a reader.
 *
 * A component that holds its own text cannot be translated without editing it,
 * and the product is committed to Arabic. Nothing here selects a language —
 * one exists — but the shape is what makes selecting one later a change at the
 * import site rather than a rewrite of every call site.
 *
 * Four rules keep a value translatable, and they are the reason this file is
 * not simply a bag of strings:
 *
 *  - **A key addresses a whole line.** A sentence is never assembled from two
 *    keys at a call site, because word order is not shared between languages.
 *  - **A value that varies takes named values through a function**, never
 *    string concatenation, so a translator can move the substitution.
 *  - **No markup inside a value.** Emphasis and line treatment are the
 *    component's; a translator receives text.
 *  - **A value reads as a line**, so it can be reflowed rather than re-split.
 */
export const AUTH_COPY = {
  brand: {
    /** The mark carries no visible text, so its accessible name lives here. */
    markLabel: "Quick Tweets",

    /*
     * Two lines rather than one sentence split for effect. Each is translated
     * whole and may be reflowed; which one the design emphasises is the
     * component's, which is why no markup travels with them.
     */
    headlineLine1: "Say more",
    headlineLine2: "with less.",

    tagline: "Short posts. Real conversations.",
  },

  /*
   * The sample posts the brand ground carries. Content rather than chrome: a
   * second language would not translate these, it would replace them, which is
   * exactly why they are addressed by key rather than written into the markup.
   */
  samplePosts: [
    {
      name: "Devon Ellis",
      handle: "@devon",
      age: "14m",
      body: "one line. that's the whole post.",
    },
    {
      name: "Sara Lindqvist",
      handle: "@sara",
      age: "31m",
      body: "the feed loads before you blink.",
    },
  ],
} as const;
