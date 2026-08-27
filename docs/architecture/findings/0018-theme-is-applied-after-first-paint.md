# Finding 0018: The theme is applied after the first paint

> **Status:** Resolved
> **Date:** 2026-08-26
> **Affected areas:** `apps/web/src/main.tsx`; `apps/web/src/app/theme.ts`; `apps/web/index.html`
> **Reported by:** Basel Ghonaim (surfaced while giving theme selection an owner, [#552](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/552))
> **Resolved:** [#552](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/552) — the selection policy moved to `apps/web/src/shared/preferences/theme/`, and the theme is now read and stamped by an inline script in `apps/web/index.html` before the first paint. `apps/web/src/app/theme.ts` no longer exists, and the markup declares no theme of its own. A check reads the script out of the markup and holds it to what the provider resolves.

## Observation

`applyTheme()` is called from `main.tsx`, inside the module graph. Everything in that graph runs **after** the browser has parsed `index.html` and painted its first frame, so the document is painted with whatever `index.html` declares — currently `data-theme="light"`, hardcoded on the `<html>` element — and only then re-stamped.

Nothing is visibly wrong today, and that is what makes it worth recording: `applyTheme()` has no argument at its call site, so it applies the same `light` the markup already declared. The two agree by coincidence.

## Why it becomes visible the moment selection exists

The instant a stored choice or a system preference can disagree with the markup, the sequence is: paint light, load the bundle, re-stamp dark, repaint. A reader who prefers dark gets a white flash on **every** load, on the surface where it is most noticeable — a full-bleed auth screen.

The defect is therefore not in the code that exists but in **where** it runs. No amount of correctness inside `applyTheme` can fix it; the read has to happen before the bundle exists, which means somewhere `index.html` reaches and a module does not.

## Why it is not resolved here

The fix belongs with the selection policy that makes it observable — a policy that reads a stored value, falls back to a system signal, and stamps the document before first paint. Recording it separately means the fix lands against a stated defect rather than arriving as an unexplained script in the markup.

It also constrains the policy's design rather than merely following it: whatever runs before the bundle **cannot import a module**, so the stored value has to be readable in one line by a script that shares no code with the provider. That rules out a serialised or wrapped format, and it is the reason a storage abstraction would not serve this consumer's hardest path.
