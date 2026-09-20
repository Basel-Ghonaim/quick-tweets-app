import { ENGLISH_FORMATS } from "./formats";

export const VALIDATION = {
  /* One whole line per field rather than a name slotted into a sentence: word
     order and agreement are not shared between languages. */
  required: {
    identifier: "Username or email is required.",
    password: "Password is required.",
    username: "Username is required.",
    email: "Email is required.",
    confirmPassword: "Confirm Password is required.",
    resetCode: "Reset code is required.",
  },
  emailFormat: "Please enter a valid email address.",
  minLength: (min: number) => ({
    min,
    message: `Must be exactly or more than ${ENGLISH_FORMATS.count(min)} characters.`,
  }),
  maxLength: (max: number) => ({
    max,
    message: `Must be exactly or less than ${ENGLISH_FORMATS.count(max)} characters.`,
  }),
  match: {
    password: "This field must match your Password.",
  },
  usernameCharset:
    "Username can only contain lowercase letters, numbers, and underscores.",
  passwordComplexity: {
    lowercase: "Password must contain a lowercase letter.",
    uppercase: "Password must contain an uppercase letter.",
    digit: "Password must contain a number.",
    special: "Password must contain a special character (@$!%*?&#).",
  },
  passwordCharacters:
    "Password can only contain English letters, numbers, spaces and symbols.",
} as const;
