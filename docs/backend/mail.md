# Mail Delivery Mechanism

> **Status:** Active.
> **Authority:** The authoritative source for the **outbound mail mechanism's design and rationale** — the port and its contract, the backends that implement it, how one is selected, and how a consumer composes it. It owns the *how* and the *why*.
> It does **not** own: the **boundary decision** — that delivery is a separately-owned mechanism a consumer composes and never absorbs — which is [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) Decision 7's, and the operational posture recorded in [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md); the **content** of any message, which belongs to the consumer that composes it; or any consumer's own behaviour — for the only consumer today, [Channel Verification](channel-verification.md).
> **Scope:** The server-side mechanism at `apps/api/src/modules/mail-delivery/`. **This document describes what exists today.** One backend delivers; the other two deliberately withhold delivery and are what a developer or the verification harness runs against.
> **Version:** 1.3
> **Last Updated:** 2026-08-31
> **Owner:** Basel Ghonaim

## Purpose & boundary

Conveying anything to a person outside the system needs an outbound mechanism. It lives here rather than inside the capability that first needed it, so that a second consumer composes the same mechanism instead of re-implementing it — the ownership direction [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) Decision 7 fixed.

**One consumer exists today**: Channel Verification's service takes an adapter and hands it a message. It reaches this mechanism only through the published surface below, and nothing above that surface can observe which backend is selected.

## The port

One method, taking a recipient, a subject and a body. The shape is deliberately **email-shaped rather than channel-agnostic**: a second channel would not send a subject line, and inventing a neutral shape from the single channel that exists would encode this one's assumptions in the name of generality.

**Failure is returned, never thrown.** A caller sends after committing its own work, so a transport error that propagated as an exception could unwind something already durable. The contract is therefore explicit that an implementation must not throw for a foreseeable transport failure — it reports one.

**The port carries no consumer vocabulary, and that is enforced rather than reviewed.** A test reads the port's own type surface, strips its comments, and fails if it mentions any of a small set of words belonging to the domain of its current consumer. Comments are excluded on purpose: the boundary lives in the types, and a guard that also policed prose would eventually be relaxed to allow a sentence. The failure mode it exists to prevent is gradual — a port erodes one helpful field at a time.

### What a send reports

**Three outcomes, not two** — `accepted`, `refused`, `unknown`. A transport produces three, and collapsing them into a boolean would make the mechanism assert something no sender can know. *Accepted* means a backend took responsibility for the message; it is **not** a claim that anything arrived. *Refused* means it definitely did not go. *Unknown* means the attempt did not finish and the message may or may not have been relayed.

**The classification rule is deliberately conservative: only a failure that provably preceded the hand-off is a refusal.** A connection that was never established, a host that did not resolve, a credential the relay rejected, an envelope it refused outright, or a permanent `5xx` — each of these is answered before any message body is transmitted, so nothing can have been delivered. Everything else is *unknown*: once the body is in flight, a timeout or a dropped socket leaves a relay that may well have accepted it and lost the acknowledgement.

The asymmetry is intended. An unnecessary *unknown* costs a log line; a wrong *refused* costs the guarantee this vocabulary exists to provide.

**The result carries no transport diagnostic** — no response code, nothing provider-shaped. A single `reason` string is the whole of what a caller learns, because a raw status code inside a provider-neutral port is transport detail leaking through the boundary the guard above exists to hold.

## The backends

Three exist. Two withhold delivery and are honest about being local; the third actually sends.

**Inert** accepts a message, discards it, and reports success, so a caller exercises its ordinary path with no transport and no credentials. It logs that a message was discarded and to whom, and **withholds the body**, which may carry a single-use secret.

**Capture** writes the whole message — headers and body — to a local directory, so a person verifying by hand has something to read. It exists because a secret that is discarded on delivery and stored only as a digest is knowable to nobody, which is exactly the property that makes such a secret trustworthy, and also what leaves hand-verification without an inbox. It creates its destination if absent, names files so they sort chronologically and are safe on any filesystem in use, and **returns a failure rather than raising one** if the write fails.

Its destination is a **convention rather than a setting** — one fewer thing to misconfigure on a mechanism whose purpose is local inspection — and it is gitignored, because the files contain whatever the message carried.

**SMTP** delivers. It is the only backend that reaches a network, and a provider is a host and a credential to it — swapping one changes configuration, never code. Its send is **bounded by a timeout**, because an unbounded attempt would hold an HTTP request open and delay shutdown; a timeout is also the commonest way an outcome becomes *unknown*.

## Selecting a backend

Selection reads one environment variable, and **the rule differs by environment — deliberately, because the cost of being wrong differs.**

**Outside production, resolution is fail-safe**: an unrecognised value warns and resolves to inert, so a mistyped setting can neither stop a developer's server nor silently select a live transport. An absent variable is the documented default rather than a mistake, and is not warned about. **Nothing ever falls back *to* capture**, which writes single-use secrets to disk and is reachable only by naming it exactly.

**In production, a mode must be able to deliver or the process does not start.** The requirement is stated positively — *can this mode deliver?* — so a future non-delivering backend is refused without anyone remembering to list it. Capture is refused there as a consequence of that rule rather than as a special case, and an unrecognised value refuses rather than falling back.

**Why the two environments differ.** The fail-safe rule was sound while nothing could send: a fallback that delivers nothing costs nothing. It stopped being sound the moment a backend could — because inert does not merely fail, it **reports success**. A misconfigured deployment would send nothing while telling every caller it had, leaving one warning line as the only trace. A fail-safe default is safe only until it manufactures a false claim, and that is the line production now sits on the other side of ([ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md) Decision 3).

The mode is **resolved once, at import**, not per send — which is what makes a production refusal a failure to boot rather than a failure at the first message.

**Selecting SMTP without its settings is refused the same way.** The host, credentials and sender identity are validated as a group when — and only when — that mode is chosen, so the server does not start rather than failing at the first send. The non-delivering backends stay credential-free, which is why the requirement is conditional rather than blanket.

## Composition

Consumers take an adapter from the mechanism's published surface and never construct a backend directly, which is what keeps a change of backend invisible above this line. A small registry maps each mode to its constructor, so adding a backend is one entry rather than a branch, and the resolved mode supplies the default.

Dependencies are injected by factory functions with default parameters, as everywhere else in the backend ([conventions](conventions.md)).

## What this mechanism does not do

Stated because their absence is a design position, not an omission:

- **It composes no message.** Subject and body arrive from the consumer, which owns its own wording, formatting and language. There is no template engine and no shared message vocabulary.
- **It does not retry, queue, or deduplicate.** A send is attempted once, synchronously, and its outcome is returned.
- **It handles no bounce, complaint or suppression.** Nothing reports back, because nothing is delivered.
- **It applies no rate limit or send quota.** The controls that exist today live with the consumer — for Channel Verification, a per-address cooldown described in [its own document](channel-verification.md) — and at the HTTP edge in [Backend Security](security.md).

## Responsibility boundary

This mechanism owns **the port, its backends, and their selection**. The **consumer owns the message** and the decision to send one. **Configuration owns which backend runs**, and nothing above the published surface may depend on the answer.

---

> This document owns the mail mechanism's design and rationale. The boundary decision is [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) Decision 7's and [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md)'s, message content belongs to the composing consumer, HTTP-edge rate limiting is [Backend Security](security.md)'s, and injection conventions are the [backend conventions](conventions.md)' — linked here, never duplicated.
