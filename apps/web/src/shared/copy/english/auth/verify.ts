import { ENGLISH_FORMATS } from "../formats";

export const VERIFY = {
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
} as const;
