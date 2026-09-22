# Finding 0013: The motion vocabulary claims a reduced-motion resolution that was never built

> **Status:** Open
> **Date:** 2026-08-18
> **Affected areas:** `apps/web/src/shared/design-system/foundations/tokens/semantic/motion.css`
> **Reported by:** Basel Ghonaim (surfaced while building the Spinner, [#523](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/523))

## Observation

The motion family annotates one of its tokens with a behaviour that does not exist:

```css
/* press-feedback transform; reduced motion resolves it to `none` */
--motion-press: scale(0.98);
```

**Nothing resolves it.** There is no `prefers-reduced-motion` rule anywhere under `foundations/`, and `foundations/resolution/` contains a single axis — `theme/`. A consumer binding `--motion-press` gets `scale(0.98)` under every preference.

The same file's header states that reduced motion is *"the earning axis"* for the family's intent tier and that *"its mechanism is out of scope"* — so the file both defers the mechanism and describes one as operative, four lines apart.

## Why this is a finding rather than a fix

Two rules meet here and neither is served by patching the comment quietly.

**The claim is false in the direction the project cares about most.** A comment that describes a resolution is read as a description of the system; the code is authoritative for what the system does ([CLAUDE.md](../../../../CLAUDE.md)), and this comment contradicts it. An agent reasoning about reduced motion from the token layer would conclude the axis is handled.

**The mechanism is deliberately deferred, not merely missing.** [ADR 0011](../../decisions/0011-intent-layer-earned-not-assumed.md) leaves *where a reduced-motion resolution lives* undecided, and explicitly declines to extend [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 5's enumerated guarantees to motion. Deleting the clause or building the resolution are both decisions about that deferral, and neither belongs in a component Work Item.

## What sharpened it

The Spinner now carries a `prefers-reduced-motion` treatment **of its own**, as a component-owned choreography. That is a legitimate answer for one component, and it makes the open question concrete rather than theoretical: if a second and third component each answer reduced motion privately, the axis has been decided by accumulation instead of by a decision.

The question this finding preserves is therefore not *"is the comment wrong"* — it is **whether reduced motion is a Foundation resolution axis alongside theme, or a per-component concern**. Only the first would make the comment true.

## Affected

- `--motion-press` — the token the clause annotates; the only one claiming a resolution.
- Any future animated component, which currently has no rule to follow and will reproduce Spinner's private choice.

## Not decided here

Whether the axis is built, whether the clause is deleted, and whether a component may keep answering privately. A finding records the deviation; it never schedules the fix.
