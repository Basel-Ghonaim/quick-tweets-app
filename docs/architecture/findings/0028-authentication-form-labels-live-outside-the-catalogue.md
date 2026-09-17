# Finding 0028: The authentication forms' labels and placeholders live outside the copy catalogue

> **Status:** Resolved
> **Date:** 2026-09-10
> **Resolved:** [#757](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/757) — the catalogue grew the namespace the schemas read, and every label, placeholder and message a form shows is now content.
> **Affected areas:** `apps/web/src/features/authentication/authFormSchemas.ts`; `apps/web/src/shared/copy/auth.ts`
> **Reported by:** Basel Ghonaim (surfaced while separating authentication from the session, [#691](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/691))

## Observation

The login and register schemas carry their user-facing text inline — `"Username or email"`, `"johndoe or you@company.com"`, `"Password"`, `"Your password"`, `"Username"`, `"johndoe"` and the rest (`authFormSchemas.ts:20-21, 27-28, 40-41` onward). None of it is in the catalogue at `shared/copy/auth.ts`, which the same screens read for their titles, subtitles and buttons.

So one screen draws its words from two sources: the catalogue for everything around the form, and the schema for everything inside it.

## Why it matters

[ADR 0018](../decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 6 makes user-facing text content addressed by key, so that adopting a translation layer replaces the catalogue without reshaping any consumer. Text that is not in the catalogue is not replaced by that step; it is found afterwards, one string at a time, by whoever notices a form still in English.

The copy Work Item (#685) moved the catalogue whole and could not have caught this — the labels were never in it.

## Not decided here

Whether the schema takes its labels from the catalogue by key, or the catalogue grows a namespace the schema reads. A finding records the deviation; it never schedules the fix.

## Addendum — 2026-09-17, resolved ([#757](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/757))

**The catalogue grew the namespace, and the schemas read it.** Sign-in's and registration's labels and placeholders sit beside the titles and buttons their screens already read, so one screen draws its words from one source. Profile's schema, which carried its own inline, moved with them.

**The same Work Item closed a second gap this Finding did not name.** The required and match messages were assembled from a field name slotted into a sentence, which a translation cannot keep: word order and agreement are not shared between languages. Each is now a whole line per field. What a reader sees is unchanged, compared word for word before and after.
