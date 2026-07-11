# Finding 0004: The logout request can never reach an error state, leaving `useLogout`'s error surface unreachable

> **Status:** Open
> **Date:** 2026-07-11
> **Affected areas:** `src/modules/auth/hooks/useAuthActions.ts`, `src/modules/auth/hooks/useLogout.ts`
> **Reported by:** Basel Ghonaim (surfaced during the #260 analysis)

## Observation

The `logout` action never resolves as a failed request: it swallows any error from the server call and always dispatches the *fulfilled* action. As a result, the `logout` request state never becomes `error`, and the error-handling surface that `useLogout` exposes — its `isError` flag and its `logoutError` effect — is currently unreachable.

Whether this is intended (a logout that always succeeds locally, so the user is signed out even when the server call fails) or a latent inconsistency between the hook's declared surface and the action's behaviour is left for a later evaluation. This finding records the observation only.

## Evidence

Verified on `main` (2026-07-11).

- `src/modules/auth/hooks/useAuthActions.ts:42-53` — `logout` dispatches `authRequestPending`, `await`s `repo.logout()` inside a `try` whose `catch` is **empty** (comment: "Even if API call fails, still clear local session"), and in `finally` always calls `clearAuthSession()` and dispatches `authRequestFulfilled({ requestType: "logout" })`. `authRequestRejected` is never dispatched for `logout`.
- `src/modules/auth/store/authSlice.ts` — only `authRequestRejected` sets a request's `status` to `"error"` (`authRequestFulfilled` sets `"success"`). Since logout never rejects, `requests.logout.status` never becomes `"error"`.
- `src/modules/auth/hooks/useLogout.ts:16-29` — derives `isError` / `logoutError` from `requests.logout` via `useRequestState`, and runs a `useEffect` that logs `"[useLogout] Session clear failed"` when `logoutError` is set. Given the above, `isError` is always `false` and that effect never runs.

## Resolution direction (not scheduled here)

None proposed. This finding records the observation only; whether it is a real issue — and, if so, what to change — is to be evaluated later under a separate Work Item. Per the Documentation Strategy, a finding records the problem; it does not schedule or decide the fix.

## Links

- Surfaced during the analysis of [#260](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/260). Deliberately kept **out of #260's scope**, which is limited to correcting the `useLogout` doc comment.
