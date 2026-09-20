export const BRAND = {
  /** The mark carries no visible text, so its accessible name lives here. */
  markLabel: "Quick Tweets",

  /* Two lines, not one sentence split: word order is not shared. */
  headlineLine1: "Say more",
  headlineLine2: "with less.",

  tagline: "Short posts. Real conversations.",

  /* Stable, because the control reports its state through `aria-pressed`. A
     name that changed as well would say the state twice. */
  themeToggle: "Dark mode",
} as const;

export const JOURNEY = {
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
} as const;

/* Replaced rather than translated in a second language. */
export const SAMPLE_POSTS = [
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
] as const;

/* Out of focus the letters are unreadable, which is what makes the ground read
   as a crowd rather than ten identical shapes. */
export const BACKDROP_POSTS = [
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
] as const;
