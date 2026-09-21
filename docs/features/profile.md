# Feature: Profile

> **Status:** Active.
> **Authority:** The authoritative source for the **profile feature**: a signed-in reader editing their own name, bio and picture. It covers what the feature does, how it **composes** the platform, and its feature-specific policies. It owns the feature, **not the mechanisms it composes**, and not the User domain it writes to.
> **Scope:** The profile capability (`apps/web/src/features/profile/`) and its behaviour. The wire contract is the API contract's: the [update](../api/api-contract.md#patch-usersme--update-own-profile), with the avatar policy the server enforces, and the [upload](../api/api-contract.md#post-media--upload-a-media-object-multipart). What happens to an uploaded picture on the server is [Media](../backend/media.md)'s.
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organisation is the [capability structure](../frontend/architecture.md#the-capability-structure), which every capability shares and which that document owns. Anything not described here is not yet built, not architecturally rejected. **This document is interim:** its flat placement under `docs/features/` and its shape hold until feature documentation is restructured. **The capability is temporary as well**, until a Users capability exists. Where it then lives is that capability's to decide ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md), Consequences), and it is kept self-contained so that the move is a directory move.
> **Version:** 1.0
> **Last Updated:** 2026-09-21
> **Owner:** Basel Ghonaim

## What the feature does

Profile is **a signed-in reader editing their own name, bio and picture**. Its one consumer today is the profile step of the post-registration journey, where the reader either saves their edits or skips the step.

- **Name and bio.** Both are optional, and each is checked only for the length the server also enforces.
- **A picture**, uploaded the moment it is chosen rather than when the form is submitted, with a retry if the upload fails.
- **Saving or skipping.** Saving sends one update; skipping sends nothing. Either way the feature reports how the step ended, `saved` or `skipped`, to whatever composed it.

## Responsibility boundary

Profile **owns** the edit: its form and the validation it composes, the state of its one request and of the picture's upload, how each field is cleared on the wire, and the wording of its refusals. It publishes a hook and **no interface**. The screen that renders the form belongs to the auth page group, which composes this feature.

It does **not** own the User domain. The update answers with more than profile reads, and the self profile, the handle and what a reader's name falls back to are that domain's; profile keeps none of them. It **commits no identity**: an update changes neither the session nor its token. It does not own **the journey**. It reports how the step ended in a type of its own, and the page passes that report on as the journey's outcome. The two types are declared separately, so the pass-through holds only while their values agree. It does not own the picture once uploaded, because storing, validating and reclaiming it are Media's.

Transport, form execution, control rendering and error normalisation belong to their platform owners and are **composed** here.

In one line: the feature decides what a reader may change and how each change travels; the server decides what it accepts.

## How the feature composes the platform

| The feature needs | It composes | Owned by |
|---|---|---|
| Its endpoints and payloads | `PATCH /users/me` and `POST /media` | [API contract](../api/api-contract.md#patch-usersme--update-own-profile) · [the upload](../api/api-contract.md#post-media--upload-a-media-object-multipart) |
| Requests as the signed-in reader | the authenticated Axios client | [Frontend API Client](../frontend/api-client.md#three-clients) |
| Sending the picture | the transport's upload call, `uploadMedia` | no owner on this tier yet: where Media's upload belongs is open in [Finding 0030](../architecture/findings/0030-the-capabilities-predate-the-structure-they-share.md) |
| What becomes of an uploaded picture | storage, content validation, attachment and reclamation | [Media](../backend/media.md) |
| Its form | a schema config driving the form engine | [Frontend Forms](../frontend/forms.md) |
| One typed error shape | normalized `AppError` | [Frontend Error Handling](../frontend/error-handling.md) |
| Its words | the catalogue's profile entries on the auth surface, in the active language | [Frontend Localisation](../frontend/localisation.md) |
| The state of its request | the shared request-state shape and its reader | [Frontend Architecture — thin utilities](../frontend/architecture.md#thin-utilities-owned-here) |

## The edit, step by step

1. **Choosing a picture starts its upload at once.** The upload has four states: idle, uploading, uploaded and failed. They are states of the screen, which is why the upload is not folded into the submit, where they would collapse into one spinner. A failure keeps the file, so a retry needs no second choice, and drops any reference, so nothing half-done ever reaches the update. Choosing again starts over, and a late answer from the earlier attempt is then ignored. Clearing the choice returns the upload to its start.
2. **Saving** checks the two lengths, then sends **one** update. It carries both text fields as they stand, and it carries the picture's reference **only once an upload has produced one**. The picture's bytes never travel with the update. On success the feature reports `saved`. A failure is worded, lands in the request state, and is shown as a form-level error, and nothing is reported.
3. **Skipping** sends nothing and reports `skipped`. Skipping is the absence of a request, and the report is what records it.

## Inside the capability

It is organised as the [capability structure](../frontend/architecture.md#the-capability-structure) says, in the layers that structure names. What follows is what each layer holds here, not a rule; the rule is that document's.

- **`model/`**: the edits, the part of the update's answer profile reads, how the step ended, the upload's four states, and the picture rules the server enforces. Those rules are mirrored here so that the screen offers nothing the server would refuse.
- **`gateway/`**: the capability's own port, for updating and for uploading, with one REST implementation over the authenticated client. Uploading delegates to the transport's upload call and answers only the reference, which is all profile keeps of a picture. The wire shape and the mapper live here too. **The two text fields clear in opposite ways**: a name clears with `null` and a bio with an empty string, and the server rejects each field's other form, so the mapper translates an empty field per field rather than passing it through.
- **`services/`**: the upload's reducer, composing the edits from the form and the upload, running the update against the request state, and wording a refusal.
- **`forms/`**: the form definition, which holds two optional fields and their length checks. The picture is not in it: its value is a reference an upload produced, not something typed in.
- **`hooks/`**: the flow hook composes the form, the request and the upload behind one submit. It hands the screen its fields, the limits it displays, and the upload's controls, so the screen names no schema of its own. A second hook runs the upload when a picture is chosen.
- **No `screens/` and no `store/`.** Profile publishes no interface, and nothing it holds outlives the screen that reads it.
- **The root barrel is the only way in**, and it offers the flow hook and nothing else. That surface, and the rule that profile holds no component, stylesheet or story, are asserted by the capability's own `boundary.test.ts`.

## Feature policies

- **What persists where:** **nothing is persisted on the client.** The update's answer is not kept, and a picture that is uploaded but never saved is left for Media to reclaim.
- **Errors speak only what this screen can meet.** A validation refusal and an expired session get profile's own words. Profile sends no username, so the conflict the endpoint can answer is not one it can cause, and it says nothing about one. Every other error keeps the platform's message.
- **The wording is the feature's; the shape and the pipeline are not.**

## Relationship to the platform documentation

This document composes; it never re-documents. If a mechanism seems missing here, such as how an upload is validated and stored, when an unattached picture is reclaimed, or what the update accepts and answers, it is deliberately absent: follow the links to its owner. The reciprocal rule also holds: platform documents never describe this feature's flow.

---

> This document owns the profile **feature**: its edit, its composition and its policies. Every mechanism it composes is owned by its platform document (see the composition map), and the wire contract by the [API contract](../api/api-contract.md), linked here and never duplicated. Where the capability finally lives is a Users capability's to decide, not this document's.
