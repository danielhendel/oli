# ADR — Account Deletion Lifecycle v1

**Status:** Accepted — human approval 2026-08-30  
**Date:** 2026-08-30  
**Canonical location:** `docs/70_adrs/` (per `docs/INDEX.md`)  
**RFC:** [RFC-account-deletion-lifecycle-v1.md](../80_rfc/RFC-account-deletion-lifecycle-v1.md)

**Persistence authorized:** Yes — Stage 1C deletion mirror + durable ledger only as defined  
**RG-LEGAL-01:** OPEN  
**Consent persistence:** Not authorized  
**Legal assent:** Inactive  
**Production deploy:** Not authorized  

---

## Context

Stage 1C ships consumer Delete Account. Implementation on `feat/consumer-stage1c-account-deletion-lifecycle` uses:

- `users/{uid}/accountDeletion/{requestId}` — request status mirror
- `accountDeletions/{uid_requestId}` — global operation record retained after user deletion

Governance search found:

- No RFC/ADR authorizing these deletion paths, retention, TTL, fields, or the global-path exception
- Consent ADR v1 defers account deletion to Stage 1C without defining storage
- Phase 3A infrastructure audits describe historical Function behavior; audits are not approval

Authoritative write paths and retention after Auth deletion require RFC → ADR → implementation (`docs/INDEX.md`).

Independent review also found Stage 1C security gaps that must be fixed under this decision before staging deploy:

1. No server-enforced recent `auth_time` on `POST /account/delete`
2. No deletion-pending backend gate on normal product APIs
3. Durable ledger created by the worker rather than at request acceptance
4. Completed ledger may retain Storage path inventories
5. Gateway OpenAPI missing delete status GET routes

---

## Decision

1. **Accept the Account Deletion Lifecycle v1 architecture** defined in the companion RFC for Stage 1C implementation and correction.

2. **Authorize two stores only:**
   - **Request mirror:** `users/{uid}/accountDeletion/{requestId}` — temporary, deleted with the user subtree before Auth deletion.
   - **Durable operation ledger:** `accountDeletions/{uid_requestId}` — narrow exception outside the user subtree for idempotent retry and sanitized completion evidence.

3. **Ledger necessity and order:** The durable ledger is required. It must be created/upserted at request acceptance **before** Pub/Sub publish and **before** destructive deletion. Worker updates it; worker is not the first writer of the only recovery evidence.

4. **Minimization:** Retained ledger fields are limited to operational status, timestamps, request correlation, sanitized error codes, and the Stage 1C operational UID join (`uid` / document id `{uid}_{requestId}`). No health data, email, tokens, export contents, signed URLs, or Storage path inventories on completed records.

5. **Retention:** Default **90-day** retention from completion (or last update if failed). Indefinite retention because a record is called an “audit” is forbidden. Excluded from consumer export and analytics. TTL/purge may be implemented in a follow-on change; the policy is binding now.

6. **Recent authentication:** `POST /account/delete` requires verified Firebase ID token `auth_time` within **5 minutes**. Client reauth UI alone is insufficient. Password never reaches the API. GET status routes use ordinary Auth only.

7. **Deletion-pending gate:** After acceptance, Cloud Run blocks normal product writes and sensitive health reads for that UID. Delete status endpoints and idempotent delete POST remain available while Auth is valid. UI hiding is not the control plane.

8. **Auth deletion last:** Integrations → export artifacts → Storage → Firestore subtree → Auth. Complete only after Auth succeeds. Worker retries without consumer credentials using the ledger.

9. **Local cleanup:** Central mobile coordinator + registry; no Account A → B leakage; recovery marker carries no secrets or health payload.

10. **Gateway:** Expose `POST /account/delete`, `GET /delete/latest`, and `GET /delete/{requestId}`.

11. **Out of scope / unchanged:** RG-LEGAL-01 remains OPEN. No consent persistence. No legal assent. No production deploy. No Stage 2.

---

## Consequences

### Security

- Prevents stale-token deletion via modified clients.
- Prevents continued product API use during pending deletion.
- Limits post-deletion retained identifiers to the governed operational join + status.
- Keeps passwords and tokens off the deletion API.

### Operational

- Crash windows after subtree deletion remain recoverable via the global ledger.
- Staging deploy and physical-iPhone verification proceed only after this ADR is Accepted and non-conforming code is fixed on PR #215 (Draft).

### Product

- Honest pending / permanent copy; no false “already erased everywhere” claim before backend completion.
- Disposable-account physical testing remains required before Stage 1C completion claims.

### Governance

- Global `accountDeletions` path is an explicit exception, not silent ordinary storage.
- Future identifier pseudonymization requires a new RFC.

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| No global ledger | Cannot retry Auth delete or prove completion after subtree removal |
| Ledger written only after Auth delete | Loses recovery evidence across the hardest crash windows |
| Client-only reauthentication | Modified clients can delete with stale but valid ID tokens |
| UI-only pending gate | Old/modified clients bypass screen hiding |
| Indefinite audit retention | Violates minimization; “audit” is not a blank check |
| New hashed operation IDs in Stage 1C without approval | Invents a second scheme mid-ship; defer to later RFC |
| Reuse consent stores for deletion | Wrong domain; consent ADR explicitly separates concerns |

---

## Status note

Human acceptance (2026-08-30) authorizes Stage 1C implementation of the deletion-request mirror and minimal durable operation ledger **only as defined in the companion RFC/ADR**. Staging deploy remains gated on conforming code, tests, and physical-iPhone verification. RG-LEGAL-01 remains OPEN. Consent persistence and legal assent remain inactive. Production deploy is not authorized.
