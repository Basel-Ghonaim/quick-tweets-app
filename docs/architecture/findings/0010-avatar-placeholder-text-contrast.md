# Finding 0010: The avatar placeholder's text fails AA because a muting opacity is applied to an already-muted colour

> **Status:** Open
> **Date:** 2026-08-09
> **Affected areas:** `src/shared/design-system/components/fields/FileInput/FileInput.module.css` (`.avatarText`), `src/shared/design-system/components/fields/FileInput/FileInput.stories.tsx`
> **Reported by:** Basel Ghonaim (surfaced by promoting the accessibility gate during WI-6)

## Observation

`.avatarText` — the "Upload a photo" placeholder inside the avatar variant's empty state — renders `--text-tertiary` **and then applies `opacity: 0.7`**. The token is already the muted end of the text scale, so the opacity mutes a mute.

Measured by the accessibility run across every avatar story:

| Text | Behind it | Ratio | AA requires |
|---|---|---|---|
| `#9499a3` (`--text-tertiary` at 0.7) | `#f3f4f6` (`--surface-subtle`) | **2.59:1** | 4.5:1 |
| `#9197a0` (`--text-tertiary` at 0.7) | `#f9fafb` (the canvas) | **2.81:1** | 4.5:1 |

Twenty-seven story assertions fail on this one rule.

**It predates WI-6 and the token migration did not cause it.** `--color-text-tertiary` resolved to `--gray-500`, the identical value `--text-tertiary` now resolves to, so the foreground is unchanged; the failure occurs against both the component's fill and the bare canvas, so it is independent of which surface token the empty state binds.

**Neither existing check can see it.** The foundation's contrast check asserts token *pairs* and cannot know that a component composites one of them through `opacity`; the tier-binding check reads references, not rendered results. Only the browser-rendered accessibility run observes the blend, and it is reporting rather than failing for this component.

## Why it is recorded rather than fixed

WI-6 is a migration: it binds values to the vocabulary and does not change them. Every available remedy is a **design decision**, not a binding:

- drop the opacity and let `--text-tertiary` carry the mute — changes the placeholder's weight in the composition;
- bind `--text-secondary` and keep the opacity — a different colour;
- keep both and accept the ratio — a decision to ship a known AA failure.

Choosing among those under migration momentum is what the effort's stop rule exists to prevent, and it is the same call [CA-1](../../plans/component-architecture-unification.md) made when the Pilot Field's gate failed on a legacy colour.

**Consequence:** FileInput's accessibility gate stays at `todo` while every other migrated component's is `error`. It is the only component left reporting rather than failing, and it stays that way until this is decided.

## Related

- [Finding 0008](0008-role-fill-hover-boundary-contrast-dark.md) — the other contrast defect the token-pair check cannot observe.
- [ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 5 places contrast under the Design System's ownership.
