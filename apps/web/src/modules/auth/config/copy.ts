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

    /* Stable, because the control reports its state through `aria-pressed`. A
       name that changed as well would say the state twice. */
    themeToggle: "Dark mode",
  },

  signIn: {
    title: "Welcome back",
    subtitle: "Sign in to continue to your account",

    submit: "Sign in",
    submitting: "Signing in…",

    forgotPassword: "Forgot password?",

    /* Where signing in ends and not having an account begins. Two controls
       stacked under a form state no relationship; this says what they are. */
    altLabel: "New to Quick Tweets?",
    createAccount: "Create new account",
    browseAsGuest: "Browse without an account",
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
  /* Out of focus the letters are unreadable, which is what makes the ground read
     as a crowd rather than ten identical shapes. */
  backdropPosts: [
    { name: "Maya Okafor", handle: "@maya", age: "2m", body: "shipped the redesign before lunch." },
    { name: "Devon Ellis", handle: "@devon", age: "14m", body: "one line. that's the whole post." },
    { name: "Sara Lindqvist", handle: "@sara", age: "31m", body: "the feed loads before you blink." },
    { name: "Ines Rahal", handle: "@ines", age: "44m", body: "wrote it twice. posted the shorter one." },
    { name: "Tom Vega", handle: "@tom", age: "1h", body: "no threads. no essays. just this." },
    { name: "Priya Nair", handle: "@priya", age: "2h", body: "shipped it. said it. done." },
    { name: "Karl Mensah", handle: "@karl", age: "3h", body: "brevity is a feature, not a limit." },
    { name: "Lena Fischer", handle: "@lena", age: "4h", body: "the whole update fits in one line." },
    { name: "Omar Haddad", handle: "@omar", age: "5h", body: "said less. meant more." },
    { name: "Ada Brennan", handle: "@ada", age: "6h", body: "one line is the entire format." },
  ],
} as const;
