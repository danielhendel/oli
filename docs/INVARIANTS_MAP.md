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
| I-01 | Client never writes derived truth (`events`, `dailyFacts`, `insights`, `intelligenceContext`) | Firestore security rules + CI static scan | **CHECK 2** + Firestore rules test + manual review | Client can corrupt truth |
| I-02 | API ingestion is idempotent (retries never create duplicates) | API route uses Idempotency-Key as document ID | **CHECK 3** + unit test + code review | Duplicate events, double counting |
| I-03 | Cloud Run writes are user-scoped only (`/users/{uid}/…`) | API route construction + CI static scan | **CHECK 4** + code review + runtime logs | Cross-user data leakage |
| I-04 | Only backend compute writes derived truth | Firestore rules (`allow write: if false`) | Firestore rules test + manual review | Client bypasses pipeline |
| I-05 | Canonical events are immutable once written | Functions design + no update paths | Code review | Historical truth mutates |
| I-06 | Account deletion deletes **all** user data and auth | Deletion executor function | **CHECK 5** + manual verification + logs | GDPR / App Store violation |
| I-07 | Cloud Run service is not publicly invokable | Cloud Run IAM policy | **CHECK 14** + manual IAM review | Public attack surface |
| I-08 | All client traffic goes through API Gateway | Infra topology + Cloud Run invoker allowlist | **CHECK 14** + infra review | Bypass auth & rate limits |
| I-09 | Authentication is mandatory on all user routes | API middleware | Unit tests + gateway config | Unauthorized access |
| I-10 | Source of truth is code, not documentation | Governance rule | Human review | Schema drift |
| I-11 | `roles/editor` is forbidden in project IAM | IAM policy snapshot + CI | **CHECK 11** | Unbounded blast radius |
| I-12 | Default service accounts must not hold elevated roles | IAM policy snapshot + CI | **CHECK 12** | Privilege creep backdoor |
| I-13 | All compute workloads must run under dedicated runtime service accounts | Cloud Run/Functions snapshots + CI | **CHECK 13** | Runtime identity drift |
| I-14 | Canonical event kinds match ingestion RawEvent kinds (no kind drift) | Contracts + CI drift check | **CHECK 15** | Ingestion can’t produce supported canonical kinds (pipeline break) |

---

## Enforcement Details

### I-01 — Client never writes derived truth
- **Enforced by**: `services/functions/firestore.rules` + CI static scan
- **Mechanism**:
  - Firestore rules deny client writes to derived collections
  - CI blocks client-side write APIs targeting derived collection names
- **Verified by**:
  - **CHECK 2** (CI)
  - Firestore emulator rules tests + manual review
- **Files**:
  - `services/functions/firestore.rules`
  - `scripts/ci/check-invariants.mjs` (**CHECK 2**)

### I-02 — API ingestion is idempotent
- **Enforced by**: Deterministic document IDs / request records
- **Mechanism**: `Idempotency-Key` → deterministic write ID (or equivalent request record)
- **Verified by**:
  - **CHECK 3** (CI)
  - Unit test + code review
- **Files**:
  - `services/api/src/routes/events.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 3**)

### I-03 — Cloud Run writes are user-scoped
- **Enforced by**: Path construction using `req.auth.uid`
- **Mechanism**:
  - API must only start Firestore paths at `collection("users")`
  - All writes must be scoped under `/users/{uid}/...`
- **Verified by**:
  - **CHECK 4** (CI)
  - Code review + runtime logs
- **Files**:
  - `services/api/src/routes/events.ts`
  - `services/api/src/routes/usersMe.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 4**)

### I-04 — Only backend compute writes derived truth
- **Enforced by**: Firestore rules
- **Mechanism**: Derived collections deny client writes (`allow write: if false`)
- **Verified by**:
  - Firestore emulator rules tests + manual review
- **Files**:
  - `services/functions/firestore.rules`

### I-05 — Canonical events are immutable
- **Enforced by**: Write-once functions, no update paths
- **Verified by**:
  - Code review
- **Files**:
  - `services/functions/src/normalization/onRawEventCreated.ts`

### I-06 — Account deletion is complete
- **Enforced by**: Recursive delete + auth deletion
- **Verified by**:
  - **CHECK 5** (CI: executor existence)
  - Manual verification + logs (runtime correctness)
- **Files**:
  - `services/functions/src/account/onAccountDeleteRequested.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 5**)

### I-07 — Cloud Run is not public
- **Enforced by**: IAM policy (no `allUsers` / `allAuthenticatedUsers`)
- **Verified by**:
  - **CHECK 14** (CI: Cloud Run invoker policy snapshot)
  - Manual IAM inspection: `gcloud run services get-iam-policy`
- **Files**:
  - `cloudrun-oli-api-iam.json`
  - `scripts/ci/check-invariants.mjs` (**CHECK 14**)

### I-08 — API Gateway is mandatory
- **Enforced by**: Cloud Run invoker policy (only API Gateway can invoke) + infra topology
- **Verified by**:
  - **CHECK 14** (CI: Gateway SA must be present in Cloud Run invoker members)
  - Infra review
- **Files**:
  - `cloudrun-oli-api-iam.json`
  - `scripts/ci/check-invariants.mjs` (**CHECK 14**)

### I-09 — Auth required on all user routes
- **Enforced by**: Auth middleware
- **Verified by**:
  - Unit tests + gateway config review
- **Files**:
  - `services/api/src/middleware/auth.ts`

### I-10 — Code is the source of truth
- **Enforced by**: Governance
- **Verified by**:
  - Human review
- **Files**:
  - `docs/SOURCE_OF_TRUTH.md`

### I-14 — Canonical kinds do not drift from ingestion kinds
- **Enforced by**: CI kind-drift tripwire
- **Mechanism**:
  - `CanonicalEventKind` in Functions must match `rawEventKindSchema` exactly.
- **Verified by**:
  - **CHECK 15** (CI)
- **Files**:
  - `lib/contracts/rawEvent.ts`
  - `services/functions/src/types/health.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 15**)

---

## IAM / Identity Invariants (Security-Blocking)

### I-11 — `roles/editor` is forbidden
- **Enforced by**: CI invariant tripwire
- **Mechanism**:
  - Parse committed project IAM snapshot JSON and fail if any binding role is `roles/editor`.
- **Verified by**:
  - **CHECK 11** (CI)
- **Files**:
  - `scripts/ci/check-invariants.mjs` (**CHECK 11**)
  - `docs/iam/project-iam-policy.snapshot.json`

### I-12 — No default service account privilege creep
- **Enforced by**: CI invariant tripwire
- **Mechanism**:
  - Fail CI if either default SA appears in any project IAM binding:
    - `serviceAccount:*compute@developer.gserviceaccount.com`
    - `serviceAccount:*@appspot.gserviceaccount.com`
- **Verified by**:
  - **CHECK 12** (CI)
- **Files**:
  - `scripts/ci/check-invariants.mjs` (**CHECK 12**)
  - `docs/iam/project-iam-policy.snapshot.json`
  - `docs/IAM_INTENT.md`

### I-13 — Dedicated runtime identities for all compute workloads
- **Enforced by**: CI invariant tripwire
- **Mechanism**:
  - Fail CI if runtime service accounts drift from allowlist:
    - Cloud Functions runtime SA must be `oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com`
    - Cloud Run `oli-api` runtime SA must be `oli-api-runtime@oli-staging-fdbba.iam.gserviceaccount.com`
- **Verified by**:
  - **CHECK 13** (CI)
- **Files**:
  - `scripts/ci/check-invariants.mjs` (**CHECK 13**)
  - `docs/iam/run-services-us-central1.snapshot.json`
  - `docs/iam/functions-v2-us-central1.snapshot.json`
  - `docs/iam/functions-v1-us-central1.snapshot.json`
  - `docs/IAM_INTENT.md`

---

## Verification Gates

- CI invariant script: `scripts/ci/check-invariants.mjs`
  - **CHECK 1** — Admin HTTP endpoints are not public and require explicit invoker
  - **CHECK 2** — Client never writes derived truth
  - **CHECK 3** — API ingestion routes enforce Idempotency-Key
  - **CHECK 4** — API Firestore root collection must be `users`
  - **CHECK 5** — Account deletion executor exists for `account.delete.v1`
  - **CHECK 6** — This document is binding and enforcement-linked
  - **CHECK 7** — iOS Pods not committed
  - **CHECK 8** — patch-package integrity
  - **CHECK 9** — API routes cannot directly import/call firebase-admin Firestore
  - **CHECK 10** — IAM snapshots present (repo-enforced)
  - **CHECK 11** — IAM forbids `roles/editor`
  - **CHECK 12** — IAM forbids default SA bindings
  - **CHECK 13** — Runtime SA allowlist enforced
  - **CHECK 14** — Cloud Run is not public and API Gateway is an authorized invoker
  - **CHECK 15** — CanonicalEventKind matches rawEventKindSchema (no kind drift)
- Firestore emulator tests
- Manual infra inspection (IAM / Gateway)

---

## Change Control

Any change to this file requires:
- Code review
- Audit acknowledgement

---

## Phase 1 (Personal Health Library) Invariants (Product-Blocking)

### I-15 — Phase 1 scope contract must exist (binding)
- **Enforced by**: CI doc existence + minimum content validation
- **Mechanism**:
  - `docs/PHASE_1_SCOPE.md` must exist
  - Must not be empty or stub-only
- **Verified by**:
  - **CHECK 16** (CI)
- **Files**:
  - `docs/PHASE_1_SCOPE.md`
  - `scripts/ci/check-invariants.mjs` (**CHECK 16**)

### I-16 — API ingestion is RawEvents-first (no direct Canonical/Derived writes)
- **Enforced by**: CI static scan of Cloud Run API for canonical/derived collection targets
- **Mechanism**:
  - Cloud Run API must not write to derived/canonical collection names directly:
    - `events`, `dailyFacts`, `insights`, `intelligenceContext`
  - All ingestion must land as RawEvents first (canonical/derived are backend compute only)
- **Verified by**:
  - **CHECK 17** (CI)
- **Files**:
  - `services/api/src/**`
  - `scripts/ci/check-invariants.mjs` (**CHECK 17**)
