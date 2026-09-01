/**
 * Four rules keep these translatable, and none of them is visible from a value:
 * a key addresses a whole line rather than a fragment, a varying value takes
 * named values through a function rather than concatenation, no markup travels
 * with text, and a value reads as a line so it can be reflowed.
 */
export const AUTH_COPY = {
  brand: {
    /** The mark carries no visible text, so its accessible name lives here. */
    markLabel: "Quick Tweets",

    /* Two lines, not one sentence split: word order is not shared. */
    headlineLine1: "Say more",
    headlineLine2: "with less.",

    tagline: "Short posts. Real conversations.",
  },

  /* Replaced rather than translated in a second language. */
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
