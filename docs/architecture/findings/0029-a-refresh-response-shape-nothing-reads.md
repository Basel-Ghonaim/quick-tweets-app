# Finding 0029: A refresh response shape that nothing reads

> **Status:** Resolved
> **Date:** 2026-09-10
> **Resolved:** 2026-09-12 ([#707](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/707))
> **Affected areas:** `apps/web/src/features/authentication/dto/RefreshResponse.ts`; `apps/web/src/features/authentication/dto/index.ts`
> **Reported by:** Basel Ghonaim (surfaced while separating authentication from the session, [#691](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/691))

## Observation

`RefreshResponseDto` — `{ accessToken }` — is declared and re-exported from the authentication feature's DTO barrel, and **no file imports it**. The refresh endpoint returns the same body as login and register, and the client has typed it as such since the session began to be restored from the server: the session's transport maps every one of those responses through one shape.

The type is a leftover from before that change, kept alive by a barrel export.

## Why it is recorded rather than deleted

It sits in the authentication feature, which does not refresh anything — the refresh belongs to the session, in the platform. Deleting it is trivial and correct, and was not this Work Item's to do: the separation moved and split what existed, and a deletion inside a split reads as a change of meaning rather than of place.

## Not decided here

Whether it is deleted in a hygiene pass or when the feature's DTOs are next touched. A finding records the deviation; it never schedules the fix.

## Resolution

Deleted when authentication was brought to the capability structure ([#707](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/707)), in a commit of its own, before its wire shapes moved into the gateway. The question this finding left open — whether it went in a hygiene pass or when the feature's wire shapes were next touched — was answered by the second: carrying a shape nothing reads into a new layer would have given that layer a file with no reason to exist.
