/** Where the reader stands. `request` is also what an absent position answers. */
export type RecoveryStep = "request" | "code" | "password";
