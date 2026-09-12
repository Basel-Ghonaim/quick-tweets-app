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

## Addendum — 2026-09-12

**The structure's server-facing layer is now `gateway/`** ([#701](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/701)). A repository is a collection of aggregates reached by identity; what this layer holds is operations against a remote system, which is a gateway. Wherever this Finding says `repository/` above, including the 2026-09-11 addendum, it names that layer by its former name.

**The session now meets the structure** (#701). It lives at `shared/session`, organised in `model/`, `gateway/`, `services/`, `store/` and `hooks/`, each with its own barrel, with its typed selector hook in `store/` and its port named `SessionGateway`. Its row above is resolved, and so is the layer-barrel gap the 2026-09-11 addendum recorded against it; authentication's `screens/` still has none.

**Journey takes the name in the same Work Item.** Its layer is `gateway/` and its port `JourneyGateway`, so the two capabilities that meet the structure meet it under one vocabulary rather than two. Authentication, recovery and channel verification take the name as each is brought to the structure; until then their `repository/` folders are a departure of the same kind as the others recorded above.

The Finding stays `Open`: four capabilities remain to be brought to the structure.

## Addendum — 2026-09-12, recovery ([#703](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/703))

**Recovery is organised as the structure says.** It holds `model/`, `gateway/`, `services/`, `forms/`, `hooks/` and `screens/`, each with a barrel that names what it offers, and its boundary test holds four rules. Its wire shapes, entity and mapper are inside the gateway, its port is `RecoveryGateway`, and its step, position, read and screen types are the model. Its row above is resolved.

**Three things about recovery remain, each with an owner.** Its three step screens still import a form definition directly, which the second of its Work Items settles. Its screen's signature still names a gateway so its stories can pass a double, which is question D in Phase 3. Its two route literals still name `/auth/signin`, which the plan's question F leaves to the page in Phase 4; both are counted in the nine recorded above.

The Finding stays `Open`: authentication, channel verification and profile remain to be brought to the structure, and the two departures that run across capabilities are unchanged.

## Addendum — 2026-09-12, recovery's screens ([#705](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/705))

**Three of the six screens that reached past their hooks no longer do.** Recovery's step screens each take their fields and their form state from one hook, which closes over the schema; the code step's hook returns the controller alone, because its screen binds its single input for the reason its own comment gives. A fifth rule in recovery's boundary test holds the seam: no file under its `screens/` reaches the forms or the services layer.

`SignIn.tsx`, `SignUp.tsx` and `Profile.tsx` still name a form definition directly, and each takes the same shape when its capability is brought to the structure. The count in the row above therefore reads three, not six.

**Recovery's Phase 2 work is complete.** What remains of its row is owned elsewhere: its screen's signature names a gateway, which is question D in Phase 3, and its two route literals wait for the page, which is question F in Phase 4.

The Finding stays `Open`: authentication, channel verification and profile remain to be brought to the structure.

## Addendum — 2026-09-12, authentication ([#707](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/707))

**Authentication is organised as the structure says.** Its credentials are the model, its wire shapes and mapper sit inside the gateway beside the port and the adapter, its form definitions have a layer, its screens have the barrel they lacked, every barrel names what it offers, and its boundary test holds five rules. Its port is `AuthGateway`, and the dead wire shape [Finding 0029](0029-a-refresh-response-shape-nothing-reads.md) recorded is gone. Its row above is resolved.

**Two of the six screens that reached past their hooks no longer do.** The flow hooks already closed over their schema, so they now hand the fields to their screens; `Profile.tsx` is the last one left, and it takes the same shape when profile is brought to the structure. The count in the row above therefore reads one.

**What remains of authentication's row is owned elsewhere.** Its seven route literals wait for the page, which is question F in Phase 4, and the error handler its barrel publishes for profile waits for question C in profile's own Work Item.

The Finding stays `Open`: channel verification and profile remain to be brought to the structure.
