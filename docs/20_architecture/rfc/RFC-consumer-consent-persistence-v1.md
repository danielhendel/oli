# RFC — Consumer Consent Persistence v1

**Status:** Draft — pending governance approval  
**Stage:** 1B  
**Date:** 2026-08-23  
**Blocks:** Durable legal-assent writes while RG-LEGAL-01 is open

---

## Problem

Oli needs a versioned, auditable consent model that separates:

1. **Legal assent** (Terms, Privacy Policy) — requires published documents (RG-LEGAL-01)
2. **Connected-source permissions** — iOS/system permissions (Apple Health, etc.)
3. **Optional product consents** — future scopes (e.g. professional data sharing)

No approved consent persistence contract, API endpoint, or Firestore path exists today.

---

## Proposal

### Consent categories

| Category | Required | Storage | RG-LEGAL-01 |
|----------|----------|---------|-------------|
| `legal_terms` | Yes (at launch) | Durable API write | **Blocked until hosted Terms exist** |
| `legal_privacy` | Yes (at launch) | Durable API write | **Blocked until hosted Privacy Policy exists** |
| `health_data_processing` | Yes (internal builds may defer UI) | Durable API write | Independent of RG-LEGAL-01 URLs but must not fake acceptance |
| `connected_source` | Per source | **Not** stored as legal consent; system permission + integration status |
| `professional_sharing` | Optional | Future; out of Stage 1B scope |

### Document reference model

Each legal consent record references:

- `consentType` — discriminated union member
- `documentKind` — `terms_of_service` | `privacy_policy` | `health_data_processing`
- `documentVersion` — semver or effective-date string from published document
- `documentUrl` — stable public HTTPS URL at time of acceptance
- `effectiveDate` — document effective date (ISO date)
- `acceptedAt` — server timestamp at write
- `withdrawnAt` — nullable; set on withdrawal
- `supersededAt` — nullable; set when a newer version replaces this record
- `actor` — `user` | `system_migration`
- `source` — `mobile` | `web` | `api`
- `idempotencyKey` — client-supplied key for safe retries

### Storage path (proposed — not implemented in Stage 1B)

```text
users/{uid}/consents/{consentId}
```

Global audit mirror (API-only writes):

```text
consentAudit/{uid}_{consentId}
```

**No screen or mobile client may write Firestore directly.**

### Read/write API (proposed)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/users/me/consents` | List current consent state (safe DTO) |
| POST | `/users/me/consents` | Record acceptance (idempotent) |
| POST | `/users/me/consents/{consentId}/withdraw` | Record withdrawal |

Writes require authenticated UID from verified token. Server rejects acceptance when document URL is missing, placeholder, or unpublished per RG-LEGAL-01.

### Withdrawal semantics

- Withdrawal records `withdrawnAt` on the consent document; prior acceptance remains in audit history.
- Withdrawal of legal assent may restrict app use per product policy (Stage 1C+).
- Withdrawal does **not** automatically revoke iOS HealthKit permissions — user must change those in Settings.

### Export and deletion

- Consent records are **included** in account export.
- Account deletion removes user-scoped consent docs per delete allowlist (Stage 1C closure).

### Migration

- First durable write creates `schemaVersion: 1` documents.
- Version bumps create new records; old records get `supersededAt`.

---

## RG-LEGAL-01 relationship

- **Legal assent remains inactive while RG-LEGAL-01 is open.**
- No record may claim acceptance of an unpublished document.
- Stage 1B may ship consent **readiness UI** and this RFC without activating writes.

---

## Stage 1B implementation boundary

| Item | Stage 1B |
|------|----------|
| RFC (this document) | Yes |
| ADR | Yes |
| Typed consent-state presentation | Yes |
| Durable Firestore writes | **No — blocked pending approval** |
| Legal-assent activation | **No — RG-LEGAL-01** |

---

## Approval required before implementation

- [ ] Product / privacy review of consent categories
- [ ] Firestore path and security rules review
- [ ] API contract review
- [ ] RG-LEGAL-01 pass for legal-assent activation
