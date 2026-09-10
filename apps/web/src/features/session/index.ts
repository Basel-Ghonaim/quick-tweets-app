export { SignIn } from "./screens/SignIn";
export { SignUp } from "./screens/SignUp";
export { refreshSession } from "./repository";
/** The guard and the journey ask whether a reader is signed in; neither may
 *  reach past this barrel to find out. */
export { useSessionRestore, useAuthState } from "./hooks";
/** Profile borrows the session's wording until it owns messages of its own —
 *  a `409` there currently reads as a registration conflict. */
export { authErrorHandler } from "./services";
/** The slice is the session's, and the composition root and every test store
 *  reach it through here rather than past it. */
export { authReducer, authActions } from "./store";
