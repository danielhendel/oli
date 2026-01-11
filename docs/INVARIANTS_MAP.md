# Oli Constitutional Invariants — Enforcement Map (Binding)

This document is **binding**.

If code diverges from any invariant listed here:
- The code **must be changed** to comply, or
- This document **must be explicitly updated** with review.

If an invariant has no **enforcement mechanism** *and* no **verification gate**, it is **not an invariant**.

---

## What This Is

A one-to-one mapping from:

**Invariant → Enforcement mechanism → Verification gate → Owning files**

This file is required by CI and is audited.

---

## Invariant Index

| ID | Invariant (Plain English) | Enforced Where | Verified By | What Breaks If Violated |
|----|--------------------------|---------------|-------------|-------------------------|
| I-01 | Client never writes derived truth (`events`, `dailyFacts`, `insights`, `intelligenceContext`) | Firestore security rules | Firestore rules test + manual review | Client can corrupt truth |
| I-02 | API ingestion is idempotent (retries never create duplicates) | API route uses Idempotency-Key as document ID | Unit test + code review | Duplicate events, double counting |
| I-03 | Cloud Run writes are user-scoped only (`/users/{uid}/…`) | API route construction | Code review + runtime logs | Cross-user data leakage |
| I-04 | Only backend compute writes derived truth | Firestore rules (`allow write: if false`) | CI rule check | Client bypasses pipeline |
| I-05 | Canonical events are immutable once written | Functions design + no update paths | Code review | Historical truth mutates |
| I-06 | Account deletion deletes **all** user data and auth | Deletion executor function | Manual verification + logs | GDPR / App Store violation |
| I-07 | Cloud Run service is not publicly invokable | Cloud Run IAM policy | CI invariant check | Public attack surface |
| I-08 | All client traffic goes through API Gateway | Infra topology | Infra review | Bypass auth & rate limits |
| I-09 | Authentication is mandatory on all user routes | API middleware | Unit tests + gateway config | Unauthorized access |
| I-10 | Source of truth is code, not documentation | Governance rule | Human review | Schema drift |

---

## Enforcement Details

### I-01 — Client never writes derived truth
- **Enforced by**: `services/functions/firestore.rules`
- **Mechanism**: No client write permissions on derived collections
- **Files**:
  - `services/functions/firestore.rules`

### I-02 — API ingestion is idempotent
- **Enforced by**: Deterministic document IDs
- **Mechanism**: `Idempotency-Key` → Firestore document ID
- **Files**:
  - `services/api/src/routes/events.ts`

### I-03 — Cloud Run writes are user-scoped
- **Enforced by**: Path construction using `req.auth.uid`
- **Files**:
  - `services/api/src/routes/events.ts`
  - `services/api/src/routes/usersMe.ts`

### I-04 — Only backend compute writes derived truth
- **Enforced by**: Firestore rules
- **Files**:
  - `services/functions/firestore.rules`

### I-05 — Canonical events are immutable
- **Enforced by**: Write-once functions, no update paths
- **Files**:
  - `services/functions/src/normalization/onRawEventCreated.ts`

### I-06 — Account deletion is complete
- **Enforced by**: Recursive delete + auth deletion
- **Files**:
  - `services/functions/src/account/onAccountDeleteRequested.ts`

### I-07 — Cloud Run is not public
- **Enforced by**: IAM policy (no `allUsers` / `allAuthenticatedUsers`)
- **Verified by**: `gcloud run services get-iam-policy`
- **Files**:
  - Cloud Run IAM policy

### I-08 — API Gateway is mandatory
- **Enforced by**: Network + IAM topology
- **Files**:
  - API Gateway config
  - Cloud Run IAM

### I-09 — Auth required on all user routes
- **Enforced by**: Auth middleware
- **Files**:
  - `services/api/src/middleware/auth.ts`

### I-10 — Code is the source of truth
- **Enforced by**: Governance
- **Files**:
  - `docs/SOURCE_OF_TRUTH.md`

---

## Verification Gates

- CI invariant script: `scripts/ci/check-invariants.mjs`
- Firestore emulator tests
- Manual infra inspection (for IAM / Gateway)

---

## Change Control

Any change to this file requires:
- Code review
- Audit acknowledgement

