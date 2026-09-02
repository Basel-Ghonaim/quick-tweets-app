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

  journey: {
    steps: {
      account: "Account",
      profile: "Profile",
      verify: "Verify",
    },

    /* Each state is said as well as coloured: a reader who cannot tell the
       colours apart still learns where they are. */
    states: {
      done: "Done",
      current: "In progress",
      optional: "Optional",
      skipped: "Skipped",
    },

    /* The list names what it is, since the steps alone do not say it. */
    label: "Registration progress",
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

  signUp: {
    title: "Create your account",
    subtitle: "This takes about a minute.",

    /* The account exists the moment this succeeds; the steps after it are
       optional, so the label names the action rather than the sequence. */
    submit: "Create account",
    submitting: "Creating account…",

    altLabel: "Already have an account?",
    backToLogin: "Back to login",
    browseAsGuest: "Browse without an account",
  },

  profile: {
    title: "Add a profile",
    subtitle: "Optional — a picture, a name and a line about you.",

    submit: "Save",
    submitting: "Saving…",
    skip: "Skip for now",

    avatarLabel: "Profile picture",
    avatarHint: "JPEG or PNG, up to 1 MB.",

    /* Announced rather than only drawn: the upload finishes while the reader is
       somewhere else on the form. */
    uploading: "Uploading your picture…",
    uploaded: "Picture ready.",
    uploadFailed: "That picture could not be uploaded.",
    uploadRetry: "Try again",

    /* The count is a live number, so it is read by sight; the limit is
       announced once through the field's own description. */
    bioCount: (used: number, limit: number) => `${used} / ${limit}`,
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
