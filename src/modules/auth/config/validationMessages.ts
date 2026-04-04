export const VALIDATION_MESSAGES = {
  required: (fieldName: string) => `${fieldName} is required.`,
  emailFormat: "Please enter a valid email address.",
  minLength: (min: number) => ({
    min,
    message: `Must be exactly or more than ${min} characters.`,
  }),
  maxLength: (max: number) => ({
    max,
    message: `Must be exactly or less than ${max} characters.`,
  }),
  match: (fieldName: string) => `This field must match your ${fieldName}.`,
  privacy: "You must accept the privacy policy to continue.",
} as const;
