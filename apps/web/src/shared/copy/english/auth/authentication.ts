export const SIGN_IN = {
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
} as const;

export const SIGN_UP = {
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
} as const;

/* Shared by sign-in and registration, which meet the same refusals. */
export const REFUSALS = {
  unauthorized: "Incorrect username/email or password.",
  validation: "Please review the highlighted fields to correct the errors.",
  conflict: "This account is already registered. Try logging in.",
  tooManyRequests: "Too many failed attempts. Please wait a few minutes.",
} as const;
