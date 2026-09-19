import { ENGLISH_FORMATS } from "./englishFormats";

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

    identifierLabel: "Username or email",
    identifierPlaceholder: "johndoe or you@company.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Your password",

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

    usernameLabel: "Username",
    usernamePlaceholder: "johndoe",
    emailLabel: "Email Address",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Min. 8 characters",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Repeat your password",
  },

  /* Shared by sign-in and registration, which meet the same refusals. */
  errors: {
    unauthorized: "Incorrect username/email or password.",
    validation: "Please review the highlighted fields to correct the errors.",
    conflict: "This account is already registered. Try logging in.",
    tooManyRequests: "Too many failed attempts. Please wait a few minutes.",
  },

  onboarding: {
    unavailable: "We could not tell where you had got to. Please try again.",
    retry: "Try again",
  },

  profile: {
    title: "Add a profile",
    subtitle: "Optional — a picture, a name and a line about you.",

    submit: "Save",
    submitting: "Saving…",
    skip: "Skip for now",

    avatarLabel: "Profile picture",
    avatarHint: "JPEG or PNG, up to 1 MB.",

    nameLabel: "Display name",
    namePlaceholder: "Your name",
    nameTooLong: (max: number) => `Name must be at most ${ENGLISH_FORMATS.count(max)} characters`,
    bioLabel: "Bio",
    bioPlaceholder: "One line is plenty.",
    bioTooLong: (max: number) => `Bio must be at most ${ENGLISH_FORMATS.count(max)} characters`,

    /* Announced rather than only drawn: the upload finishes while the reader is
       somewhere else on the form. */
    uploading: "Uploading your picture…",
    uploaded: "Picture ready.",
    uploadFailed: "That picture could not be uploaded.",
    uploadRetry: "Try again",
    /* Only what this screen can meet: it sends no username, so the conflict
       the endpoint answers is not one it can cause. */
    invalid: "Please review the highlighted fields.",
    sessionExpired: "Your session has expired. Please sign in again.",

    /* The count is a live number, so it is read by sight; the limit is
       announced once through the field's own description. */
    bioCount: (used: number, limit: number) =>
      `${ENGLISH_FORMATS.count(used)} / ${ENGLISH_FORMATS.count(limit)}`,
  },

  verify: {
    /* Two states, so two titles: one asks, the other receives. */
    askTitle: "Verify your email",
    askSubtitle: "Optional — you can also do this later from your account.",
    codeTitle: "Enter your code",
    codeSubtitle: "We sent a code to your email address.",

    /* What verifying buys, at the level the soft gate actually supports. Which
       actions are restricted is not settled anywhere, so this names none. */
    reason:
      "Unverified accounts keep a reminder in the app, and some actions stay unavailable until the address is confirmed.",

    send: "Send code",
    sending: "Sending…",
    submit: "Verify email",
    submitting: "Verifying…",
    later: "Later",
    backToProfile: "Back to profile",

    codeLabel: "Verification code",
    codeHint: "Letters and digits. Case and spacing do not matter.",

    resend: "Resend code",
    resendIn: (seconds: number) => `Resend in ${ENGLISH_FORMATS.count(seconds)}s`,
    resendReady: "You can request a new code now.",

    cooldownRefused: "A code was sent moments ago. Wait a little before asking for another.",
    rateLimited: "Too many requests from this device. Try again in about 15 minutes.",
    codeRejected: "That code is not valid. Check it and try again.",
  },

  recovery: {
    /* Three steps under one title each, since the card's header is the only
       title on the screen and is rewritten as the server moves the reader. */
    requestTitle: "Reset your password",
    requestSubtitle: "We will email you a code to set a new one.",
    codeTitle: "Enter your code",
    /* The address is the server's mask, never what the reader typed: echoing an
       unmasked identifier on a recovery screen is a documented incident. */
    codeSubtitle: (masked: string) =>
      `We sent a 12-character code to ${ENGLISH_FORMATS.identifier(masked)}.`,
    passwordTitle: "Set a new password",
    passwordSubtitle: "Choose one you have not used on this account before.",

    /* Says nothing about whether the address belongs to an account, because
       nothing may. Identical on every branch, to a reader and to a screen
       reader alike. */
    sent: "If an account exists for that address, a code is on its way. It expires shortly.",

    emailLabel: "Email Address",
    emailPlaceholder: "you@company.com",
    codeLabel: "Reset code",
    codePlaceholder: "XXXX-XXXX-XXXX",
    codeHint: "Letters and digits. Case, spacing and dashes do not matter.",
    newPasswordLabel: "New password",
    newPasswordPlaceholder: "Min. 8 characters",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your new password",

    send: "Send code",
    sending: "Sending…",
    submitCode: "Verify code",
    submittingCode: "Verifying…",
    submitPassword: "Reset password",
    submittingPassword: "Resetting…",
    backToLogin: "Back to login",

    resend: "Resend code",
    resendIn: (seconds: number) => `Resend in ${ENGLISH_FORMATS.count(seconds)}s`,
    resendReady: "You can ask for a new code now.",
    resendSpent: "You have asked for a new code as often as this attempt allows.",
    startOver: "Wrong address? Start over",

    /* One message for every refusal, because the server gives one: naming a
       cause would distinguish expired from wrong from already used. */
    codeRejected: "That code is not valid. Check it, or ask for a new one.",
    lapsed: "That reset is no longer valid. Ask for a new code to start again.",
    rateLimited: "Too many requests from this device. Try again in about 15 minutes.",
    unavailable: "We could not tell where you had got to. Please try again.",
    retry: "Try again",

    /* Carried by the move to sign in, since a reload after a completed reset
       lands on an empty position with nothing left to say. */
    done: "Your password has been changed. Sign in with it.",
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
