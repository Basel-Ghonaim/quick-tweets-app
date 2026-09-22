# Finding 0004: The logout request can never reach an error state, leaving `useLogout`'s error surface unreachable

> **Status:** Resolved
> **Date:** 2026-07-11
> **Resolved:** 2026-07-14 (PR #296)
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

## Resolution

Resolved on 2026-07-14 by [PR #296](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/296) (Issue [#294](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/294) — *Logout Reliability*). The later evaluation this finding anticipated has happened, and it resolved the recorded ambiguity **toward making the error surface reachable and intended** rather than toward "logout always succeeds locally": the flow no longer swallows the server error, and it signs the user out locally **only after the server confirms** the logout — the server is the source of truth for ending a session.

The swallow-error / always-`fulfilled` behaviour the observation recorded is gone:

- The logout flow was extracted into `src/modules/auth/services/executeLogout.ts`. On a **failed** server call it now dispatches `authRequestRejected({ requestType: "logout", … })` (`executeLogout.ts:19-27`) in place of the old empty `catch` + always-`authRequestFulfilled`. `authRequestRejected` is the only action that sets a request's `status` to `"error"` (`src/modules/auth/store/authSlice.ts`), so `requests.logout.status` **does** reach `"error"` on failure — closing the exact gap this finding named.
- On a **successful** logout the flow dispatches `authLogout()` (a full auth-slice reset) rather than `authRequestFulfilled({ requestType: "logout" })`; "signed out" is observed via `isLoggedIn` going false, so no unused logout-*success* surface is introduced either (`src/modules/auth/hooks/useLogout.ts` JSDoc records this).
- `useLogout` therefore reaches its `isError` flag and its `logoutError` effect when the server logout fails (`useLogout.ts:18-25`) — the previously-unreachable surface is now live and load-bearing (it is what a user-initiated retry keys off).

The reachability of `authRequestRejected → status: "error"` is locked by the auth store-access characterization test — `src/modules/auth/store/authStoreContract.test.ts` ("records the error and marks error on rejected").

**No ADR:** #294 changed a flow's behaviour within the existing auth Model/Service/Component pattern — not architecture, layer boundaries, or dependency direction — so the [ADR 0002](../../decisions/0002-refined-adr-threshold.md) threshold is not met, consistent with how Findings 0001/0002/0003 were resolved.

## Links

- Surfaced during the analysis of [#260](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/260). Deliberately kept **out of #260's scope**, which is limited to correcting the `useLogout` doc comment.
