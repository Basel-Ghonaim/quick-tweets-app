import type { RecoveryPosition } from "./RecoveryPosition";

/** Where the reader stands. `request` is also what an absent position answers. */
export type RecoveryStep = "request" | "code" | "password";

export type RecoveryRead =
  | { status: "unresolved" }
  | { status: "resolved"; position: RecoveryPosition }
  | { status: "failed" };

/** What the recovery route shows. Every value is the server's or a wait for it. */
export type RecoveryScreen = "pending" | "retry" | RecoveryStep;
