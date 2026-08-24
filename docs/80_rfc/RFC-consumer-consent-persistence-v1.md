# RFC — Consumer Consent Persistence v1

**Status:** Accepted (architecture) — human approval 2026-08-24; persistence not authorized in PR #214  
**Stage:** 1B (architecture only; no persistence in PR #214)  
**Date:** 2026-08-23  
**Canonical location:** `docs/80_rfc/` (per `docs/INDEX.md`)  
**Blocks:** Durable legal-assent writes while RG-LEGAL-01 is OPEN

---

## Problem

Oli needs a versioned, auditable consent model that separates unrelated categories and never records acceptance of unpublished legal documents. The August 10 consumer-launch audit found no consent capture. Labs review flows have local `acceptedAt` fields but no general consumer consent layer.

No approved consent persistence contract, API endpoint, or Firestore path exists in code today.

---

## Consent categories (must not collapse into one boolean)

| Category | Required at launch | Storage model | Notes |
|----------|-------------------|---------------|-------|
| `legal_terms` | Yes | Durable API-mediated consent **events** | Blocked until hosted Terms exist (RG-LEGAL-01) |
| `legal_privacy` | Yes | Durable API-mediated consent **events** | Blocked until hosted Privacy Policy exists (RG-LEGAL-01) |
| `health_data_processing` | Yes (product/legal as required) | Durable API-mediated consent **events** | Must not fake acceptance; may be gated separately from public URLs |
| `connected_source` | Per source | **Not** legal consent — system/iOS permission + integration connection status | Apple Health, Oura OAuth, etc. |
| `optional_communications` | Optional | Future durable events if introduced | Marketing/product messaging — never conflated with legal assent |
| `professional_sharing` | Optional | Future; out of Stage 1B | Scope-limited professional data sharing |
| `research` | Optional | Only if separately introduced | Must never be implied by Terms/Privacy alone |

---

## Legal-document identity

Every future legal assent event must reference:

| Field | Requirement |
|-------|-------------|
| `documentType` | `terms_of_service` \| `privacy_policy` \| `health_data_processing` (extensible) |
| `documentId` | Stable identifier for the published document family |
| `documentVersion` | Version string from the published document (not client-invented) |
| `effectiveDate` | Document effective date (ISO date) |
| `documentUrl` | Stable public HTTPS URL at time of acceptance |
| `locale` | Locale of the accepted document where relevant |
| `contentHash` | Immutable content fingerprint (or equivalent) of the published document at acceptance, where justified |

**Server rejects** acceptance when:

- Document URL is missing, placeholder, localhost, or non-HTTPS
- Document is unpublished per RG-LEGAL-01
- Version / effective date / content hash cannot be verified against the published document registry

No acceptance may be created when the document is unpublished.

Internal informational readiness UI is **not** assent.

---

## Event lifecycle (append-oriented)

Consent evidence is modeled as **events** (or event-equivalent append-only records). The client must not author trusted timestamps.

Each event carries:

| Field | Source |
|-------|--------|
| `eventId` | Server-generated |
| `consentCategory` | Discriminated category |
| `action` | `accepted` \| `withdrawn` \| `superseded` |
| `acceptedAt` | **Server** timestamp only (on accept) |
| `withdrawnAt` | **Server** timestamp only (on withdraw) |
| `supersededAt` | **Server** timestamp only (on supersede) |
| `replacedByVersion` / `replacedByEventId` | When a newer document version supersedes |
| `actor` | `user` \| `system_migration` |
| `source` | `mobile` \| `web` \| `api` |
| `idempotencyKey` | Client-supplied; server enforces idempotency |
| `reason` | Optional; required on withdrawal when product policy requires it |
| `requestId` | Correlation id for the API request |

**Do not** silently overwrite the only evidence of a prior consent event. Prior accepts remain in history; withdrawal and supersession are additive.

**Current-state projection:** derived server-side from the ordered event history (latest non-withdrawn, non-superseded accept per category/document family). Clients receive a safe DTO of current state, not raw event stores.

---

## Storage and API boundaries (proposed — not implemented in Stage 1B)

### Proposed paths (label: PROPOSED; unimplemented)

```text
users/{uid}/consentEvents/{eventId}     # append-only event evidence
users/{uid}/consentState/{category}     # optional projection; API-only writes
consentAudit/{uid}_{eventId}            # optional global audit mirror; API-only
```

These paths are **not** deployed and must not appear in mobile code until an approved implementation stage.

### Rules

- User-scoped storage
- **API-only writes** (Admin SDK / Cloud Run)
- Authenticated reads of safe DTOs
- **No direct Firestore from screens**
- Idempotency via `idempotencyKey`
- Recomputable current state from events
- Migration/versioning via new events + `supersededAt`

### Proposed API (unimplemented)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/users/me/consents` | Current consent state (safe DTO) |
| POST | `/users/me/consents` | Record acceptance (idempotent) |
| POST | `/users/me/consents/{eventId}/withdraw` | Record withdrawal |

Writes require authenticated UID from verified token.

---

## Withdrawal and related actions (distinct)

| Action | Meaning | Effect |
|--------|---------|--------|
| Withdraw legal consent | User revokes Terms/Privacy/health-processing assent | Records `withdrawnAt`; may restrict app use per product policy |
| Disconnect a data source | Revoke Oura/integration connection | Integration status only; not legal withdrawal |
| Revoke Apple Health in iOS Settings | User changes HealthKit sharing | **Oli cannot revoke iOS permissions programmatically**; UX must say so |
| Request account deletion | Stage 1C | Deletes or retains per Stage 1C allowlist and law |
| Disable future processing | Product restriction after withdrawal | Derived from current consent state |
| Legal retention | Law requires keeping records | Export/delete disclosure; Stage 1C closure |

---

## Export and deletion treatment

- Consent **history** is included in user data export when persistence exists.
- Account deletion (Stage 1C) removes user-scoped consent docs per delete allowlist, or retains legally required records with honest disclosure.
- Stage 1C owns deletion UI, reauthentication, local purge, and coverage closure.

---

## RG-LEGAL-01 relationship

- **Legal assent remains inactive while RG-LEGAL-01 is OPEN.**
- No fake legal version exists.
- No fake acceptance exists.
- No consent record may point to an unavailable policy.
- Internal informational readiness UI is not assent.
- Stage 1B may ship this RFC, the ADR, and readiness UI **without** activating writes.

---

## Stage 1B implementation boundary

| Item | Stage 1B |
|------|----------|
| RFC (this document) | Yes |
| ADR | Yes |
| Typed consent-state presentation | Yes |
| Durable Firestore / API writes | **No** |
| Legal-assent activation | **No — RG-LEGAL-01** |

---

## Earliest implementation point

After:

1. Human acceptance of this RFC and companion ADR
2. RG-LEGAL-01 PASS for legal-document assent activation
3. Explicit implementation stage that adds contracts, API, rules, and tests

Recommended: post–RG-LEGAL-01 ownership follow-on (may be after Stage 1C merge sequencing as product decides); **not** PR #214.

---

## Approval checklist (before any persistence code)

- [x] Human governance acceptance of this RFC + ADR (2026-08-24)
- [ ] Product / privacy review of consent categories (for implementation stage)
- [ ] Firestore path and security rules review (implementation stage)
- [ ] API contract review (implementation stage)
- [ ] RG-LEGAL-01 pass for legal-assent activation
