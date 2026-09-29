# Finding 0043: The dialog's props do not extend its element, and redeclare an attribute the element owns

> **Status:** Open
> **Date:** 2026-09-29
> **Affected areas:** `apps/web/src/shared/design-system/components/overlays/Dialog/Dialog.types.ts`; every caller of `Dialog`
> **Reported by:** Basel Ghonaim (surfaced while rendering the dialog's drawn forms, [#843](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/843))

The [authoring contract](../../../frontend/design-system/components.md) states the prop vocabulary in two sentences: props **extend the native element**, and *"an attribute the element already owns is never redeclared as a prop."* `Dialog` keeps neither.

## Observation 1 — the element is out of reach

`DialogBase` (`Dialog.types.ts:10`) is a closed interface. It does not extend `NativeProps<"dialog">`, so no caller can put an `id`, a `className`, a `style`, a `data-` attribute or an ARIA attribute on the `<dialog>` this component renders. Its own stories find the element with `querySelector("dialog")` (`Dialog.stories.tsx:115`) because nothing a caller passes reaches it.

Every other component in the layer that renders one element extends that element — `Toast` and `ToastRegion` among them. `Menu` does not, and is not the same case: it renders a trigger and a surface, and no single element is its own.

## Observation 2 — `title` means something else here

`title` is a global attribute: the advisory text a browser shows on hover. `Dialog.types.ts:19` redeclares it as the dialog's heading, which the element never receives. `open` (`:12`) is redeclared too, with a narrower meaning than the attribute's: the prop opens the dialog *modally*, which the attribute alone would not. Only `onClose` (`:15`) coincides with what the element already has — it is passed straight through (`Dialog.tsx:82`).

The cost of the first is that the day a caller needs the element — to measure it, to name it for a test, to set a page's own custom property on it — the answer is a change to this component rather than a prop it already takes. The cost of the second is that `title` cannot be admitted later without the two meanings colliding.

## Why it is recorded rather than fixed

The Work Item that surfaced it was scoped to rendering the drawn forms. Extending the element means renaming `title`, which is a change to every caller's contract, and none of the drawn forms needed it. That Work Item added `onDismiss`, `dismissLabel`, `action` and the `task` form without widening the departure: none of them shadows an attribute `<dialog>` owns, and the first two are `Toast`'s vocabulary for the same concept.

## Not decided here

What `title` is renamed to, and whether `open` keeps its name while meaning *open modally*.
