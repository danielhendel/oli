# ADR — Consumer Consent Architecture v1

**Status:** Accepted (architecture only) — human approval 2026-08-24  
**Date:** 2026-08-23  
**Canonical location:** `docs/70_adrs/` (per `docs/INDEX.md`)  
**RFC:** [RFC-consumer-consent-persistence-v1.md](../80_rfc/RFC-consumer-consent-persistence-v1.md)

**Persistence implemented:** No  
**Legal assent active:** No  
**RG-LEGAL-01:** OPEN  
**Human approval:** Accept Consumer Consent Architecture v1 for future implementation. No Firestore/API consent writes in PR #214.

---

## Context

Stage 1B requires consumers to understand consent and permission boundaries without falsely recording legal acceptance while RG-LEGAL-01 is open. The August 10 consumer-launch audit found no consent capture. Labs review flows have local `acceptedAt` fields but no general consumer consent layer.

Governance requires RFCs in `docs/80_rfc/` and ADRs in `docs/70_adrs/`.

---

## Decision

1. **Consent-event architecture (not a mutable boolean).** Acceptance, withdrawal, and supersession are additive, auditable events. Current state is a server-derived projection from event history. A single `accepted: true` flag was rejected because it erases history, cannot express supersession, and cannot support honest export/deletion.

2. **Separate legal assent from connected-source permissions.** Apple Health and similar integrations remain iOS/system permissions with honest status in Your Data — never a generic legal checkbox that implies HealthKit access.

3. **API-only write boundary.** When persistence is implemented, only Cloud Run (verified auth UID) writes consent evidence. Screens never write Firestore. Clients never author trusted timestamps.

4. **Document version strategy.** Legal assent events must bind to published document identity: type, stable id, version, effective date, URL, locale where relevant, and content hash (or equivalent). Server rejects unpublished / placeholder documents.

5. **Withdrawal strategy.** Withdrawal appends a withdrawal event; prior acceptance remains in history. Withdrawal does not revoke iOS HealthKit permissions. Disconnecting an integration is not legal withdrawal. Account deletion is Stage 1C.

6. **RG-LEGAL-01 dependency.** Legal assent stays inactive until hosted Privacy, Terms, and Support readiness pass. Informational readiness UI is not assent.

7. **Export includes consent history** when persistence exists. Deletion / legal retention treatment is Stage 1C coverage closure.

8. **No Firestore path is deployed as fact.** Paths in the RFC are labeled **proposed** and remain unimplemented until an approved implementation stage.

---

## Consequences

### Security

- Prevents client-forged acceptance timestamps and unpublished-document assent.
- Preserves audit evidence; reduces risk of silent overwrite of consent history.
- Keeps HealthKit authorization out of the legal-consent store.

### Operational

- Stage 1B can ship Data Export and readiness UX without durable consent storage.
- Persistence requires a later implementation PR after RFC/ADR acceptance and RG-LEGAL-01 for legal documents.
- Migration will create `schemaVersion`-aware events; supersession uses new events rather than mutating prior evidence.

### Product

- Consumers see honest inactive legal readiness while RG-LEGAL-01 is OPEN.
- No “You agreed” / fake versions / fake `acceptedAt` in Stage 1B.

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| One mutable boolean per category | Erases history; no supersession/withdrawal audit trail |
| Checkbox accepting unpublished Terms/Privacy | Violates RG-LEGAL-01; false audit trail |
| AsyncStorage-only consent | Not durable, not exportable, not API-governed |
| Reuse labs review `acceptedAt` for legal assent | Wrong domain; no versioning or withdrawal model |
| Skip consent UX until launch | Stage 1B ownership stage requires honest readiness |
| Implement Firestore paths in Stage 1B | Governance and RG-LEGAL-01 block writes; inventing paths in code is forbidden |

---

## Future migration implications

- First implementation creates event schema v1 via API + rules + contracts.
- Document registry (version, URL, hash) must exist before accept endpoints activate for legal categories.
- Existing users get no fabricated historical assent; first accept is a new event after documents publish.

---

## Status note

This ADR records the **architectural decision**. Human acceptance (2026-08-24) authorizes the architecture for **future** implementation only. It does **not** authorize persistence code in PR #214. Legal assent remains inactive while RG-LEGAL-01 is OPEN.
