# 🔍 Invariant Enforcement Map (Operational)

**Authority:** subordinate to docs/00_truth/INVARIANTS_MAP.md  
**Scope:** current implementation evidence (CI checks, file paths, infra snapshots)

**Note:** IDs in this document represent operational enforcement controls; constitutional invariants live in `docs/00_truth/INVARIANTS_MAP.md` and may map to multiple operational controls.

This document is **binding**.

If code diverges from any invariant listed here:
- The code **must be changed** to comply, or
- This document **must be explicitly updated** with review.

If enforcement is missing, it must be explicitly tracked as planned and phase-scoped.

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
| I-05 | Canonical events are immutable once written | Functions design + no update paths | **CHECK 18** + code review | Historical truth mutates |
| I-06 | Account deletion deletes **all** user data and auth | Deletion executor function | **CHECK 5** + manual verification + logs | GDPR / App Store violation |
| I-07 | Cloud Run service is not publicly invokable | Cloud Run IAM policy | **CHECK 14** + manual IAM review | Public attack surface |
| I-08 | All client traffic goes through API Gateway | Infra topology + Cloud Run invoker allowlist | **CHECK 14** + infra review | Bypass auth & rate limits |
| I-09 | Authentication is mandatory on all user routes | API middleware | Unit tests + gateway config | Unauthorized access |
| I-10 | Source of truth is code, not documentation | Governance rule | Human review | Schema drift |
| I-11 | `roles/editor` is forbidden in project IAM | IAM policy snapshot + CI | **CHECK 11** | Unbounded blast radius |
| I-12 | Default service accounts must not hold elevated roles | IAM policy snapshot + CI | **CHECK 12** | Privilege creep backdoor |
| I-13 | All compute workloads must run under dedicated runtime service accounts | Cloud Run/Functions snapshots + CI | **CHECK 13** | Runtime identity drift |
| I-14 | Canonical event kinds match ingestion RawEvent kinds (no kind drift) | Contracts + CI drift check | **CHECK 15** | Ingestion can’t produce supported canonical kinds (pipeline break) |
| I-17 | Derived truth must be historically replayable (append-only ledger captures what was known) | Backend derived writers must emit immutable ledger runs + snapshots | **CHECK 19** + code review | “What was known at the time” cannot be reconstructed |
| I-18 | Readiness vocabulary is canonical (missing, partial, ready, error) — no drift | CI static scan of app/lib/components for disallowed strings | **CHECK 20** | Readiness semantics fragment; UI/redux drift; downstream bugs |
| I-19 | Phase 1 definition doc must match enforced routes + readiness (repo-truth LAW) | CI reads PHASE_1_DEFINITION.md and asserts content | **CHECK 21** | LAW doc drifts from CI-enforced reality; auditors get wrong contract |
| I-20 | Phase 2 definition doc must contain Authority & Truth Contract, Logging Primitives, No Proactive Prompts, Uncertainty (Visibility or First-Class Truth) (LAW) | CI reads PHASE_2_DEFINITION.md and asserts required sections | **CHECK 22** | Phase 2 LAW drifts from CI-enforced reality; truthful capture invariants unverified |


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
  - **CHECK 18** (CI: canonical writes must be immutable; normalization cannot overwrite canonical truth)
  - Code review
- **Files**:
  - `services/functions/src/normalization/onRawEventCreated.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 18**)

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
  - `docs/00_truth/SOURCE_OF_TRUTH.md`

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
  - `docs/_snapshots/iam/project-iam-policy.snapshot.json`

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
  - `docs/_snapshots/iam/project-iam-policy.snapshot.json`
  - `docs/50_security_privacy/iam/IAM_INTENT.md`

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
  - `docs/_snapshots/iam/run-services-us-central1.snapshot.json`
  - `docs/_snapshots/iam/functions-v2-us-central1.snapshot.json`
  - `docs/_snapshots/iam/functions-v1-us-central1.snapshot.json`
  - `docs/50_security_privacy/iam/IAM_INTENT.md`

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
  - **CHECK 18** — Canonical events are written immutably (no overwrite)
  - **CHECK 19** — Derived writers emit Derived Ledger runs (append-only historical truth)
  - **CHECK 20** — Readiness vocabulary is canonical (Phase 1 Lock #3; no loading/empty/invalid/etc.)
  - **CHECK 21** — PHASE_1_DEFINITION.md must match enforced routes + readiness (repo-truth LAW)
  - **CHECK 22** — PHASE_2_DEFINITION.md must exist and contain required sections (Authority & Truth Contract, Logging Primitives, No Proactive Prompts, Uncertainty Visibility or Uncertainty as First-Class Truth)
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
  - `docs/00_truth/phase1/PHASE_1_SCOPE.md` must exist
  - Must not be empty or stub-only
- **Verified by**:
  - **CHECK 16** (CI)
- **Files**:
  - `docs/00_truth/phase1/PHASE_1_SCOPE.md`
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

  ### I-17 — Derived truth is historically replayable (append-only ledger)
- **Enforced by**: Derived writers emit append-only ledger runs + immutable snapshots
- **Mechanism**:
  - Every write to `dailyFacts`, `insights`, or `intelligenceContext` must also emit:
    - `/users/{uid}/derivedLedger/{day}/runs/{runId}` (append-only)
    - `/users/{uid}/derivedLedger/{day}/runs/{runId}/snapshots/...` (append-only snapshots)
- **Verified by**:
  - **CHECK 19** (CI)
  - Code review
- **Files**:
  - `services/functions/src/pipeline/derivedLedger.ts`
  - `services/functions/src/realtime/onCanonicalEventCreated.ts`
  - `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts`
  - `services/functions/src/insights/onInsightsRecomputeScheduled.ts`
  - `services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 19**)

### I-18 — Readiness vocabulary is canonical (Phase 1 Lock #3)
- **Enforced by**: CI static scan of `app`, `lib`, `components` for disallowed readiness strings
- **Mechanism**:
  - Canonical vocabulary: `missing` | `partial` | `ready` | `error`
  - Disallowed: `loading`, `empty`, `invalid`, `not-ready`, `unknown`, `unready`, `pending`, `coming_soon`
  - Scan matches `status: "X"` or `state: "X"` where X is disallowed (excludes `network: "loading"` in resolveReadiness)
- **Verified by**:
  - **CHECK 20** (CI)
- **Files**:
  - `lib/contracts/readiness.ts`
  - `scripts/ci/check-invariants.mjs` (**CHECK 20**)
  - `scripts/ci/readiness-drift-check.mjs` (extracted logic, testable)

### I-19 — Phase 1 definition doc must match enforced reality (repo-truth LAW)
- **Enforced by**: CI invariant tripwire
- **Mechanism**:
  - `docs/00_truth/phase1/PHASE_1_DEFINITION.md` must exist
  - Must contain canonical readiness vocabulary (missing | partial | ready | error)
  - Must contain "Required API routes" section with every route from `assert-api-routes.mjs`
  - Must contain "Required UI routes" section with every route from `assert-ui-routes.mjs`
- **Verified by**:
  - **CHECK 21** (CI)
- **Files**:
  - `docs/00_truth/phase1/PHASE_1_DEFINITION.md`
  - `scripts/ci/check-invariants.mjs` (**CHECK 21**)
  - `scripts/ci/__tests__/phase1-definition-invariant.test.ts`

### I-20 — Phase 2 definition doc must contain required LAW sections
- **Enforced by**: CI invariant tripwire
- **Mechanism**:
  - `docs/00_truth/phase2/PHASE_2_DEFINITION.md` must exist
  - Must contain required sections: Authority & Truth Contract, Logging Primitives, No Proactive Prompts, Uncertainty Visibility or Uncertainty as First-Class Truth
- **Verified by**:
  - **CHECK 22** (CI)
- **Files**:
  - `docs/00_truth/phase2/PHASE_2_DEFINITION.md`
  - `scripts/ci/check-invariants.mjs` (**CHECK 22**)
  - `scripts/ci/__tests__/phase2-definition-invariant.test.ts`

