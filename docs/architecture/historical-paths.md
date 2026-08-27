# Historical Paths

> **Status:** Active.
> **Authority:** A **navigation aid, not a source of truth.** It maps paths that a restructure changed, so that a document written before the change stays readable without being edited. **It defines no structure and owns no rule** — the repository's structure is [ADR 0013](decisions/0013-applications-and-cross-tier-packages.md)'s, and each subsystem's layout belongs to the document that owns it.
> **Scope:** Path changes only, and only those a reader of an older document would otherwise fail to resolve.
> **Version:** 1.1
> **Last Updated:** 2026-08-27
> **Owner:** Basel Ghonaim

## 2026-08-05 — theme grouped under a resolution axis

| Written as | Now reads |
|---|---|
| `…/design-system/foundations/theme/…` | `…/design-system/foundations/resolution/theme/…` |

Theme became one resolution axis among the several the architecture anticipates, rather than the whole concept, so its files moved under a directory named for the axis instead of for the theme.

## 2026-08-13 — applications relocated under `apps/`

| Written as | Now reads |
|---|---|
| `src/…` | `apps/web/src/…` |
| `server/…` | `apps/api/…` |

Everything beneath either path moved with it, content unchanged; `git log --follow` traces any file across the move.

## Why the old paths are still there

A document that describes the **current** system is corrected when the system changes. A document that records **what was true when it was written** is not: ADRs and findings cite evidence as it stood at the time of observation, and the findings register is append-only ([Documentation Strategy §9](documentation-strategy.md)). Rewriting those citations would edit the record rather than the repository, and would quietly assert that the evidence had been gathered somewhere it never was.

[ADR 0013](decisions/0013-applications-and-cross-tier-packages.md) fixes that as a migration invariant. This table is what pays for it — the reason the record can be left intact without becoming unnavigable.

---

> This table is consulted, never applied: nothing should be renamed, moved, or structured because of what it says. When the last document citing a pre-migration path is superseded on its own terms, the entry above stops being needed.
