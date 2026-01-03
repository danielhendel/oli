# Oli Constitutional Invariants — Enforcement Map (Binding)

This document is **binding**. If code diverges, code must change or this file must be updated in the same PR.

## What this is
A one-to-one map from:
**Invariant → Enforcement mechanism → Verification gate → Owning files**

If an invariant has no enforcement + verification, it is not an invariant — it is a wish.

---

## Invariant Index

| ID | Invariant (Plain English) | Enforced Where | Verified By | What breaks if violated |
|---:|---|---|---|---|
| I-01 | **Client never writes derived truth** (`events`, `dailyFacts`, `insights`, `intelligenceContext`) | Client architecture (only ingestion API writes), code tripwire | `scripts/ci/check-invariants.mjs` CHECK 2 | Users can forge “truth”; pipeline becomes meaningless |
| I-02 | **API ingestion is idempotent** (retries do not create duplicates) | `services/api/src/routes/events.ts` deterministic doc ID + `create()` | `scripts/ci/check-invariants.mjs` CHECK 3 | Duplicate raw events → incorrect daily facts/insights |
| I-03 | **Cloud Run writes are user-scoped only** (`/users/{uid}/...`) | API uses `db.collection("users").doc(uid)...` | `scripts/ci/check-invariants.mjs` CHECK 4 | Deletion/export becomes unsafe; cross-user leakage risk |
| I-04 | **Admin/recompute endpoints are not public** | Functions HTTP endpoints must set `invoker` explicitly and never `public` | `scripts/ci/check-invariants.mjs` CHECK 1 | Anyone can trigger recompute/privileged ops |
| I-05 | **Account deletion is end-to-end real** (route ⇒ executor exists) | API queues delete; Functions Pub/Sub executes deletion | `scripts/ci/check-invariants.mjs` CHECK 5 | App Store compliance failure; platform trust failure |
| I-06 | **RawEvent contract is canonical & validated before write** | `services/api/src/routes/events.ts` + `rawEventDocSchema` | Jest: `services/functions/src/validation/__tests__/rawEvent.contract.test.ts` | Downstream pipeline breaks or silently corrupts |
| I-07 | **Normalization is deterministic** (same RawEvent → same CanonicalEvent) | `services/functions/src/normalization/*` | Jest: `mapRawEventToCanonical.test.ts` | Facts drift; insights drift; user loses trust |
| I-08 | **DailyFacts aggregation is deterministic & tested** | `services/functions/src/dailyFacts/*` | Jest: `aggregateDailyFacts.test.ts`, `enrichDailyFacts.test.ts` | Score/insights become unstable/noisy |

---

## Enforcement Details

### I-01 — Client never writes derived truth
- **Enforced:** Architectural boundary (client reads only) + CI tripwire
- **Verified by:** CHECK 2 in `scripts/ci/check-invariants.mjs`
- **Owning areas:** `app/**`, `lib/**`, ingestion API
- **Notes:** This is a heuristic tripwire. If you later introduce a legitimate client write, you must justify and update invariant.

### I-02 — API ingestion is idempotent
- **Enforced:** Deterministic IDs from `Idempotency-Key`, `docRef.create()`
- **Verified by:** CHECK 3
- **Owning file:** `services/api/src/routes/events.ts`
- **Failure mode:** Duplicates on retry (mobile network reality) corrupt daily facts.

### I-03 — Cloud Run writes are user-scoped only
- **Enforced:** API must start all paths at `.collection("users")`
- **Verified by:** CHECK 4
- **Owning scope:** `services/api/src/**`
- **Failure mode:** deletion/export cannot be correct; blast radius increases.

### I-04 — Admin endpoints are not public
- **Enforced:** Functions `invoker` must be explicit and not public on admin-ish endpoints
- **Verified by:** CHECK 1
- **Owning scope:** `services/functions/src/http/**`

### I-05 — Account deletion is end-to-end real
- **Enforced:** API exposes deletion route; Functions consumes Pub/Sub topic and deletes Firestore subtree + Auth
- **Verified by:** CHECK 5
- **Owning scope:** `services/api/src/routes/account.ts`, `services/functions/src/account/onAccountDeleteRequested.ts`

### I-06–I-08 — Data pipeline determinism (RawEvent → Canonical → DailyFacts → Insights)
- **Enforced:** Pure functions + deterministic transforms
- **Verified by:** Jest tests listed above
- **Owning scope:** `services/functions/src/**`

---

## Change Control
Any PR that:
- changes schema, ingestion, pipeline, deletion/export, or security boundaries
MUST update this file and keep CI green.
