# Frontend Localisation

> **Status:** Active.
> **Class:** Contract ([Documentation Strategy §3](../architecture/documentation-strategy.md)) — the rules the interface's language follows, for whoever adds a language, a line or a consumer.
> **Authority:** The authoritative source for the web interface's **language**: how a reader's language is resolved, chosen and stamped on the document, how the catalogues are served and read, how numbers and the values a line takes are written, and what a language's words need before they ship. It does **not** own the words themselves (the catalogues in `shared/copy`), how the Design System adapts to direction and script ([ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 6, the [Design System](design-system/README.md)), which languages the product is committed to (the [overview](../project/overview.md)), or the sequencing of the work that builds them ([Arabic and RTL support](../plans/arabic-rtl-support.md)).
> **Scope:** The web interface: the language preference in `apps/web/src/shared/preferences/language/`, the mechanism in `apps/web/src/shared/localisation/`, and the shape of the catalogues in `apps/web/src/shared/copy/`. Server-side language is outside it.
> **Version:** 1.2
> **Last Updated:** 2026-09-19
> **Owner:** Basel Ghonaim

## Why the language has an owner

A reader's language decides every word the interface says and the direction the page reads in, and both have to be settled before anything is drawn. It is decided in two places that share no code — a script that runs before the first paint, and the application after it — and read by every screen, handler and control. Rules that span that many places need one home, or each place grows its own answer.

## The reader's language

**It is resolved in one order:**

1. the reader's stored choice, when it names a registered language exactly;
2. otherwise the browser's languages, in its order of preference, each matched on its base language, so `ar-EG` is Arabic;
3. otherwise English.

**Only a registered language can be resolved**, and a language is registered by having a catalogue. There is no language in the URL.

**The direction follows the language and is never chosen.** The document carries the language in `lang` and its direction in `dir`. A language written right to left is declared as one ahead of its catalogue, because the direction is stamped before the first word is read.

**Both are stamped before the first paint**, by an inline script in `index.html`, since no module runs early enough ([Finding 0018](../architecture/findings/0018-theme-is-applied-after-first-paint.md)). The script and the application share no code, so a check holds them together: the script declares exactly the registered languages and the same fallback, gives every language it names or can stamp the application's direction, and reaches the application's decision on every path, from the same storage key, and when storage cannot be read. That copy of the language set is [Finding 0019](../architecture/findings/0019-pre-paint-script-hardcodes-the-theme-set.md)'s duplication, made loud rather than silent.

**While no choice is stored, the document follows the browser** when its languages change. A stored choice holds whatever the browser does.

**A reader chooses a language by naming one a catalogue exists for, and no other.**
- The choice outranks the browser from that moment, and it is stored so the next visit, and the script before its first paint, read it.
- Where storage refuses, the choice still holds for the rest of the visit.
- Nothing returns a reader to following the browser once they have chosen.

**A language is offered in its own words:** its name as its own readers write it, marked as that language, so a reader who cannot read the page can still find one they can.

## The catalogues

**One catalogue per language**, each registered with the localisation mechanism by the [composition root](architecture.md#the-composition-root). The mechanism holds no catalogue of its own and never imports one: content travels into the platform ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 6).

**English is the source**, and every other catalogue has its shape: the same keys at every depth, however the catalogue is assembled, and a line that takes values is handed the same ones. A translation may leave a value unused; it cannot ask for another. A catalogue that drifts from English does not compile.

## Reading the words

**Production reads the active catalogue through its accessors, when it needs words** — `useCopy` in a component, `currentCopy` elsewhere. It never reads a catalogue constant, and never reads while a module loads, because either would hold one language's words for the life of the page. The mechanism's own readers are the accessors' alone. A check holds the imports and every direct read; a read hidden in a helper that runs while a module loads is left to review.

**Code that is not a component takes its words as an argument** from the hook that calls it. The error pipeline, which no hook calls, reads its default wording through a resolver the composition root hands it ([error handling](error-handling.md)).

**A word is resolved when it is produced.** Everything rendered from the catalogue renders again when the language changes. A message already produced — a field's error, a refusal — keeps its language until the next validation or attempt produces another.

**The Design System and the platform's mechanisms hold no words**; each takes its words from its caller ([component authoring](design-system/components.md)).

## Writing numbers

**A catalogue writes the numbers in its lines through its own language's formats**, on a locale pinned to Western digits and the Gregorian calendar. Without the pin, a region's defaults would change both: `ar-EG` writes Arabic-Indic digits, and `fa-IR` dates by the Persian calendar.

- **A count is whole and ungrouped**, so a countdown reads `1200s`.
- **A file size takes its unit at 1024 bytes, to one decimal.** The units' words are the catalogue's.
- **A line that changes with a count chooses its form by its language's plural rules.** English uses one or other; Arabic has six forms.

## Values a line did not write

**A line holds apart any value it was handed that it did not write**, through its language's formats, so that the value and the line cannot reorder each other.
- **An identifier** — a masked address, for example — is held left to right, since it reads that way on any page.
- **Words a reader wrote**, such as a file's name, are held in the direction of their own first letter.

This covers a value inside a line, where no element exists to carry a direction. Where an element does exist, the [Design System](design-system/components.md) sets the direction instead.

## Approving a language's words

**English is the source language.** Arabic content is approved by a named native-Arabic approver before its catalogue ships. A catalogue that compiles is complete in shape; only the approver says it is right.

**An approval names what it approved.** It is recorded on the Work Item that registers or changes the catalogue, naming the commit that holds the approved words, before that Work Item merges. Any later change to those words needs approval again.

---

> This document owns the interface's language: its resolution and choice, its catalogues' mechanism and shape, how numbers and values are written, and the approval rule. The words are the catalogues'; how the interface adapts to direction and script is the [Design System](design-system/README.md)'s; which languages the product is committed to is the [overview](../project/overview.md)'s — linked here, never duplicated.
