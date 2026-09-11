# Finding 0030: The capabilities predate the structure they are to share

> **Status:** Open
> **Date:** 2026-09-11
> **Affected areas:** `apps/web/src/features/authentication/`; `apps/web/src/features/recovery/`; `apps/web/src/shared/session/`; `apps/web/src/shared/channel-verification/`; `apps/web/src/features/journey/`; `apps/web/src/modules/auth/profile/`; `apps/web/src/modules/auth/screens/Profile/`; `apps/web/src/shared/api/channelVerification.ts`; `apps/web/src/shared/api/media.ts`
> **Reported by:** Basel Ghonaim (surfaced while recording the capability structure, [#695](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/695))

## Observation

The [capability structure](../../frontend/architecture.md#the-capability-structure) was recorded after the six capabilities it governs had been built, and **none of them is organised as it says**. They took three shapes: by role, by concern, and flat.

| Capability | How it departs |
|---|---|
| authentication | its wire shapes and mapper sit in `dto/` and `mapper/` beside the repository rather than inside it; its credential types (`credentials.ts`) and form definitions (`authFormSchemas.ts`) sit loose at the root; no boundary test |
| recovery | its wire shapes, entities and mapper sit in `dto/`, `entity/` and `mapper/`; its step types (`recovery.types.ts`) and form definitions (`recoveryFormSchemas.ts`) sit loose at the root; no boundary test |
| session | the structure's layers under other names — `transport/` for `repository/`, `state/` for `store/`, `lifecycle/` for `services/` — with its typed selector hook in `hooks/` rather than `store/` |
| channel verification | its endpoints live in the transport, `shared/api/channelVerification.ts`, which its repository only delegates to, and the challenge type it returns is declared there too; no boundary test |
| journey | flat; no boundary test |
| profile | flat, its form definition beside everything else; no boundary test |

Two departures run across capabilities rather than within one:

- **Screens reach past their hooks.** Six import a form definition directly — `SignIn.tsx:5`, `SignUp.tsx:4`, `RecoveryRequest.tsx:5`, `RecoveryCode.tsx:6`, `RecoveryPassword.tsx:5`, `Profile.tsx:4`. Nine route literals in authentication's and recovery's screens name routes neither feature owns — `SignIn.tsx:24,66,79,83`, `SignUp.tsx:22,70,72`, `Recovery.tsx:29`, `StepLayout.tsx:28`. `Profile.tsx:11-12` holds the avatar's accepted types and size, which the server also states.
- **Media's upload has no capability to live in.** `shared/api/media.ts` is the frontend's only reach to Media, and profile is its one consumer. It sits in the transport because no frontend capability owns it.

## Why it matters

The structure exists so that a reader knows where a kind of thing lives without first learning each capability's habits. Until the code follows it, the structure describes the target rather than the tree — and a newcomer who copies the nearest capability copies whichever of the three shapes they happened to open.

## Why it is recorded rather than resolved

Bringing each capability to the structure is the work the [Frontend Capability Structure plan](../../plans/frontend-capability-structure.md) sequences, one capability per Work Item. The structure was recorded first precisely so that no one of those Work Items decides it for the rest.

## Not decided here

The order in which the capabilities are brought to it, which is the plan's. Whether a screen may name a repository in its signature so that its stories can pass a test double — four do today — which is a question that plan leaves open. Where Media's upload belongs once a second consumer needs it.

## Addendum — 2026-09-11

**Journey now meets the structure** ([#699](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/699)). It lives at `features/journey`, organised in `model/`, `repository/`, `services/` and `hooks/`, each with its own barrel, and its boundary test holds its rules. Its row above is resolved.

**The structure gained a rule in the same change** — each layer carries its own `index.ts` — and two capabilities do not yet meet it: none of the session's four layers has one, and authentication's `screens/` has none. Recovery and channel verification already do.

The Finding stays `Open`: five capabilities remain to be brought to the structure.
