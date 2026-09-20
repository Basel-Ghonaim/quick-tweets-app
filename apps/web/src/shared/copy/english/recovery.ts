import { ENGLISH_FORMATS } from "./formats";

export const RECOVERY = {
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
} as const;
