# ADR — Consumer Consent Architecture v1

**Status:** Accepted (architecture); persistence **not implemented** pending RFC approval  
**Date:** 2026-08-23  
**RFC:** [RFC-consumer-consent-persistence-v1.md](../rfc/RFC-consumer-consent-persistence-v1.md)

---

## Context

Stage 1B requires consumers to understand consent and permission boundaries without falsely recording legal acceptance while RG-LEGAL-01 is open. The August 10 consumer-launch audit found no consent capture. Labs review flows have local `acceptedAt` fields but no general consumer consent layer.

---

## Decision

1. **Separate legal assent from connected-source permissions.** Apple Health and other integrations remain iOS/system permissions with honest status in Your Data — not a generic legal checkbox.

2. **Do not invent Firestore paths in implementation code** until the RFC is approved. Stage 1B ships typed consent readiness states and informational UX only.

3. **Keep legal assent inactive** until RG-LEGAL-01 passes (hosted Privacy Policy, Terms, Support URLs verified).

4. **API-only writes** when persistence is implemented. Mobile screens use the API boundary; no direct Firestore access.

5. **Export includes consent** when persistence exists. Deletion treatment follows Stage 1C coverage closure.

---

## Consequences

- Stage 1B can complete Data Export without durable consent storage.
- PR remains accurate: consent architecture is **designed**, persistence is **blocked pending approval**.
- Stage 1C or a follow-up stage activates writes after RG-LEGAL-01 and governance sign-off.

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Checkbox accepting unpublished Terms/Privacy | Violates RG-LEGAL-01; creates false audit trail |
| Store consent in AsyncStorage only | Not durable, not exportable, not API-governed |
| Reuse labs review `acceptedAt` for legal assent | Wrong domain; no versioning or withdrawal model |
| Skip consent UX until launch | Stage 1B ownership stage requires honest readiness |
