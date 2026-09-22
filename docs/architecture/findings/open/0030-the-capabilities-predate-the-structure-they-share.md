# Finding 0030: The capabilities predate the structure they are to share

> **Status:** Open
> **Date:** 2026-09-11
> **Affected areas:** `apps/web/src/features/authentication/`; `apps/web/src/features/recovery/`; `apps/web/src/shared/session/`; `apps/web/src/shared/channel-verification/`; `apps/web/src/features/journey/`; `apps/web/src/modules/auth/profile/`; `apps/web/src/modules/auth/screens/Profile/`; `apps/web/src/shared/api/channelVerification.ts`; `apps/web/src/shared/api/media.ts`
> **Reported by:** Basel Ghonaim (surfaced while recording the capability structure, [#695](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/695))

## Observation

The [capability structure](../../../frontend/architecture.md#the-capability-structure) was recorded after the six capabilities it governs had been built, and **none of them is organised as it says**. They took three shapes: by role, by concern, and flat.

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

Bringing each capability to the structure is the work the [Frontend Capability Structure plan](../../../plans/frontend-capability-structure.md) sequences, one capability per Work Item. The structure was recorded first precisely so that no one of those Work Items decides it for the rest.

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

**Authentication is organised as the structure says.** Its credentials are the model, its wire shapes and mapper sit inside the gateway beside the port and the adapter, its form definitions have a layer, its screens have the barrel they lacked, every barrel names what it offers, and its boundary test holds five rules. Its port is `AuthGateway`, and the dead wire shape [Finding 0029](../resolved/0029-a-refresh-response-shape-nothing-reads.md) recorded is gone. Its row above is resolved.

**Two of the six screens that reached past their hooks no longer do.** The flow hooks already closed over their schema, so they now hand the fields to their screens; `Profile.tsx` is the last one left, and it takes the same shape when profile is brought to the structure. The count in the row above therefore reads one.

**What remains of authentication's row is owned elsewhere.** Its seven route literals wait for the page, which is question F in Phase 4, and the error handler its barrel publishes for profile waits for question C in profile's own Work Item.

The Finding stays `Open`: channel verification and profile remain to be brought to the structure.

## Addendum — 2026-09-12, channel verification ([#711](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/711))

**Channel verification is organised as the structure says.** It holds `model/`, `gateway/`, `services/` and `hooks/`, each with a barrel that names what it offers, and its boundary test holds five rules. Its two endpoints and the challenge shape came home from `shared/api`, which no longer mentions the capability, and its port is `VerificationGateway`. Its row above is resolved, and so is the departure that row recorded about its endpoints living in the transport.

**The resend window no longer crosses the page.** The capability reads where the holder stands when the code screen mounts, and holds the answer as an instant rather than a duration. The ask hands nothing forward, the code screen takes no window, and the onboarding screen holds no verification state. No client-side cooldown is kept anywhere: the number is the server's in all three places it states it.

The Finding stays `Open`: profile remains to be brought to the structure, and the two departures that run across capabilities are unchanged but for the one form-definition import profile still carries.

## Addendum — 2026-09-12, profile ([#713](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/713))

**Profile is organised as the structure says, and every capability now is.** It lives at `features/profile` with `model/`, `gateway/`, `services/`, `forms/` and `hooks/`, each with a barrel that names what it offers, and its boundary test holds five rules. It publishes a hook and its port and nothing else: no interface, no schema, no limits. Its row above is resolved, and with it the last of the six rows this Finding opened with.

**Both cross-feature imports are gone.** Profile wrote its own wording, which ended the borrow this Finding's sibling question C recorded, and its hook speaks its own settlement rather than the journey's outcome; the screen that composes both maps one to the other, which is a page's business. Its avatar upload now goes through its own gateway rather than reaching the transport directly.

**The screens that reached past their hooks no longer do.** All six form-definition imports the row above recorded are gone, the last of them profile's.

The Finding stays `Open` for what remains across capabilities: the nine route literals, which question F leaves to the page in Phase 4, and Media's upload, which still has no capability of its own — profile reaches it through its own gateway now, but where it finally belongs is undecided. Where profile itself lives once a Users capability exists is likewise open, and the move will be a directory move.

## Addendum — 2026-09-14, the zone this Finding was written in no longer exists ([#733](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/733))

**The auth page group exists and `modules/` is deleted**, with the `@modules` alias that reached it. Every path this Finding cites under `apps/web/src/modules/auth/` is mapped in [historical paths](../../historical-paths.md); nothing above is edited, because each citation records where evidence stood when it was gathered.

**What the page group took**, and why each piece is the composition's rather than a capability's: the two layouts and their parts, because a page group holds the layout; the progress display, which is question E; the verification screens, which is question A; the profile form, because profile publishes a hook and no interface; the route table and the access guard, because a page group publishes a route subtree and a guard belongs visibly at each route. Its boundary is held by five checks, each proven by an isolated mutation.

**Two exports this Finding's siblings recorded came off their barrels.** `authErrorHandler` lost its last consumer when profile wrote its own wording in #713, and `JourneyMove` lost its when the story that typed a spy with it moved to the component lane in #719. Neither is a gateway.

**The nine route literals still stand, and question F is now recorded in the plan rather than only in these addenda.** Three of this Finding's addenda cited a question the plan never carried; it carries it now. **It is recorded, not answered**: how a capability's screen learns a destination it does not own is a mechanism nobody has ruled, and inventing one inside a restructure is what this plan's rules forbid.

**The seam is untouched by decision.** The `repo?` prop on five screens, the optional gateway on every hook, and the three published ports all remain exactly as they were. Removing them turns out to require splitting each screen from its presentation, which is a change to how every screen in the tree is written — so it was deferred whole, rather than begun and left half-made.

The Finding stays `Open`: the route literals and Media's upload are unchanged, and where profile lives once a Users capability exists is still undecided.

## Addendum — 2026-09-15, the effort closes and what outlives it ([#740](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/740))

**Every row this Finding opened with is resolved, and the two departures that ran across capabilities are settled or scheduled.** The seam — the `repo?` prop on five screens, the optional gateway on six hooks, and the three published ports — is gone ([#735](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/735)), removed rather than ratified: both lanes now say what the server answers instead of being handed an answerer, so no production declaration remains whose only consumer is a test.

**The nine route literals have a home for the question, not an answer.** They stand exactly where this Finding recorded them, and the question of how a screen learns a destination it does not own is now [#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739) — open, with no approach adopted or ruled out. It gates nothing: Phase 4 closed with the literals left, and Phase 5's enforcement landed without depending on it.

**What still has no answer**, and is not this Finding's to invent: where Media's upload belongs, now that profile reaches it through its own gateway; and where profile itself lives once a Users capability exists, which remains a directory move by construction. A fifth thing joins them — the four capabilities this effort created still share one document, which is [Finding 0034](../resolved/0034-four-capabilities-are-described-by-a-document-that-does-not-own-them.md).

The Finding stays `Open` for those.

## Addendum — 2026-09-21, the shared document is resolved ([#786](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/786))

**[Finding 0034](../resolved/0034-four-capabilities-are-described-by-a-document-that-does-not-own-them.md) is resolved.** Recovery, profile and the journey have documents of their own, so the fifth item the 2026-09-15 addendum added to this Finding's open list no longer stands. Profile's document states that the capability is temporary until a Users capability exists, which puts this Finding's open question where readers of the capability will meet it.

The Finding stays `Open`: where Media's upload belongs, and where profile lives once a Users capability exists, are unchanged. The frontend's reach to Media also has no description, which [Finding 0036](0036-documentation-the-feature-split-found-missing.md) records beside the other gaps.
