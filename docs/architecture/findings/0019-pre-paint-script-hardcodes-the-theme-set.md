# Finding 0019: The pre-paint script hardcodes the theme set, where nothing can see it

> **Status:** Open
> **Date:** 2026-08-26
> **Affected areas:** `apps/web/index.html`; `apps/web/src/shared/design-system/foundations/resolution/theme/theme.ts`
> **Reported by:** Basel Ghonaim (surfaced while reviewing the theme selection policy, [#552](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/552))

## Observation

A theme has to be applied before the first paint, which means before any module exists — so the markup carries an inline script that reads the stored choice and stamps it. That script names the themes:

```js
var THEMES = { light: "#fafafe", dark: "#171424" };
```

[ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 4 makes the mechanism **theme-count agnostic** — *"a theme is one of an open, named set of resolutions, not a light/dark boolean — additional themes … slot into the same mechanism with no architectural change"* — and its Alternatives section rejects the opposite by name: *"hardcoding two themes forecloses high-contrast / brand / seasonal for no benefit."*

The declared set lives in `theme.ts`. The script's copy of it is the only one nothing checks.

## Evidence

Adding a third member to `THEMES` and running everything:

| | Result |
|---|---|
| `applyTheme.ts` | **fails to compile** — `Record<ThemeName, string>` forces exhaustiveness |
| `index.html` | **89 tests pass** — the script silently cannot stamp the new theme |

The existing check reads `THEMES`, but it asserts the script's *output* is a member of the set, never that the script *knows* every member. It therefore passes vacuously on exactly the change it should catch.

The failure is quiet in the worst way: a reader whose stored theme is one the script does not recognise is painted the fallback, then corrected on hydration — the flash the script exists to remove, returning only for the newest theme.

## Why it is not resolved here

The Work Item that surfaced it was giving theme selection an owner, and the fix is a build-time concern rather than a policy one. Three routes were weighed:

- **Inject the set at build time** — a `transformIndexHtml` plugin reads `theme.ts` and writes the script's data, leaving one source of truth. The strongest answer, and the only one that removes the duplication rather than guarding it. It puts app source into the build config, which nothing here does yet.
- **Make the check exhaustive** — assert the script resolves correctly for *every* member of `THEMES`. Roughly five lines, removes the silence but not the duplication: adding a theme would then fail loudly and demand a manual edit in two places.
- **Move the chrome colour out of the script**, leaving only the theme name to duplicate. Narrows the problem without closing it, and costs a correct browser chrome on the first frame.

The middle option is cheap enough to be tempting and is worth taking only as a stopgap; it makes a theme addition noisy rather than silent, which is a smaller claim than the ADR's.

## Addendum — 2026-09-17, the language set joins it ([#763](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/763))

**The markup now carries a second copy of a declared set.** The language, and the direction that follows it, have to be stamped before the first paint for the same reason the theme is, so a second inline script declares the registered languages, the fallback and the languages written right to left.

**This copy is held by the middle option above, taken deliberately.** A check asserts that the script declares exactly the languages a catalogue is registered for and the same fallback, that it gives every language it names or can stamp the module's direction, and that it reaches the module's decision on every path. A new language therefore fails loudly until the script knows it. The duplication itself remains, as it does for the theme, and generating the script's data stays with [#554](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/554).
