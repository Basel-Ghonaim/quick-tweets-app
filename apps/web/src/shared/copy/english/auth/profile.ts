import { ENGLISH_FORMATS } from "../formats";

export const PROFILE = {
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
} as const;
