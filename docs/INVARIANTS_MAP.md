# Oli Constitutional Invariants — Code Map (Binding)

This document maps each Constitutional Invariant to the concrete code + infra artifacts that:
- **ENFORCE** it (mechanisms that make it true)
- **DEPEND ON** it (assumptions that break if violated)
- **VIOLATE / RISK** it (known gaps or fragile areas)
- **TEST / GUARD** it (automated checks, if any)

**Rule:** If an invariant is not enforced by code/infra/tests, it is not real.

---

## How to Use This Map

Before shipping any feature or refactor:
1) Find the invariants it touches.
2) Review the “RISK / VIOLATIONS” items.
3) Ensure enforcement exists (or add a guard).
4) Update this map in the same PR.

---

# Invariant Index

## I — Truth is Deterministic

### I.1 Single Source of Truth
**Definition:** Only one truth hierarchy exists:
Raw Events → Canonical Events → Derived Facts → Intelligence Context.

**ENFORCED BY**
- [ ] (list files)
**DEPENDS ON**
- [ ] (list features/screens)
**RISK / VIOLATIONS**
- [ ] (duplicate truth paths, shadow caches, client-side derivations)
**TEST / GUARD**
- [ ] (tests / CI checks)

---

### I.2 Truth Must Be Reproducible
**Definition:** Same inputs + pipeline version → same outputs.

**ENFORCED BY**
- [ ] pipelineVersion fields / deterministic aggregation
**DEPENDS ON**
- [ ] insight generation correctness
**RISK / VIOLATIONS**
- [ ] nondeterministic IDs, time-based transforms
**TEST / GUARD**
- [ ] snapshot tests for aggregators

---

### I.3 Truth Readiness is Enforced
**Definition:** “READY” is a server-side fact, not a UI guess.

**ENFORCED BY**
- [ ] readiness endpoint / meta checks
**DEPENDS ON**
- [ ] Command Center rendering semantics
**RISK / VIOLATIONS**
- [ ] refreshBus/caching hacks, partial fetch fanout
**TEST / GUARD**
- [ ] readiness contract tests

---

## II — Ingestion is Disciplined

### II.1 One Way In
**Definition:** All ingestion flows through one contract/front door.

**ENFORCED BY**
- [ ] API ingestion routes
**DEPENDS ON**
- [ ] all future integrations
**RISK / VIOLATIONS**
- [ ] secondary ingestion endpoints (Functions HTTP, direct Firestore writes)
**TEST / GUARD**
- [ ] CI check: forbid additional ingest entrypoints

---

### II.2 Idempotency is Mandatory
**Definition:** Retries never create duplicate raw events.

**ENFORCED BY**
- [ ] Idempotency-Key → deterministic write ID
**DEPENDS ON**
- [ ] mobile retry behavior
**RISK / VIOLATIONS**
- [ ] routes ignoring Idempotency-Key, random UUID writes
**TEST / GUARD**
- [ ] unit test: same key → same doc id

---

### II.3 Provenance is Required
**Definition:** Each event declares source/method/time/confidence.

**ENFORCED BY**
- [ ] schema validation at ingestion boundary
**DEPENDS ON**
- [ ] trust scoring, explainability
**RISK / VIOLATIONS**
- [ ] missing sourceId/ingestionMethod fields
**TEST / GUARD**
- [ ] schema validation tests

---

## III — Derived Data is Sacred

### III.1 Derived Data is Backend-only
**Definition:** Clients can never write derived truth.

**ENFORCED BY**
- [ ] Firestore rules deny writes to derived collections
**DEPENDS ON**
- [ ] trust in Command Center
**RISK / VIOLATIONS**
- [ ] client code writing to /dailyFacts, /insights, /intelligenceContext
**TEST / GUARD**
- [ ] CI check scanning client write paths

---

### III.2 Derived Data Must Be Explainable
**Definition:** Every derived value traces to inputs + version.

**ENFORCED BY**
- [ ] meta fields (computedAt, pipelineVersion, input anchors)
**DEPENDS ON**
- [ ] future AI explanations
**RISK / VIOLATIONS**
- [ ] derived docs without input anchors
**TEST / GUARD**
- [ ] tests: derived includes required meta

---

## IV — Scale Must Be Intentional

### IV.1 Compute Matches Data Frequency
**Definition:** High-frequency data cannot trigger full-day recompute storms.

**ENFORCED BY**
- [ ] incremental aggregation / debounced recompute policy
**DEPENDS ON**
- [ ] steps/HR/sleep ingestion
**RISK / VIOLATIONS**
- [ ] recompute-on-every-event for high-frequency streams
**TEST / GUARD**
- [ ] load/cost test harness (future)

---

### IV.2 Cost Growth Must Be Predictable
**Definition:** No quadratic reads/event amplification.

**ENFORCED BY**
- [ ] bounded queries, batch processing
**DEPENDS ON**
- [ ] multi-stream ingestion
**RISK / VIOLATIONS**
- [ ] fanout queries per event
**TEST / GUARD**
- [ ] CI budgets (future)

---

## V — Security is Non-Negotiable

### V.1 No Admin Surface is Public
**Definition:** No admin/recompute endpoint is publicly invokable.

**ENFORCED BY**
- [ ] Cloud Run IAM: no allUsers invoker on admin services
**DEPENDS ON**
- [ ] system stability + cost control
**RISK / VIOLATIONS**
- [ ] accidental allUsers binding
**TEST / GUARD**
- [ ] CI check: fail if admin service has allUsers invoker

---

### V.2 Least Privilege Always
**Definition:** Services have only required IAM permissions.

**ENFORCED BY**
- [ ] Terraform / IAM bindings
**DEPENDS ON**
- [ ] containment of breach
**RISK / VIOLATIONS**
- [ ] editor/owner roles on service accounts
**TEST / GUARD**
- [ ] IAM policy diff checks (future)

---

### V.3 Perimeter Assumptions are Explicit
**Definition:** Public services must be intentional + protected.

**ENFORCED BY**
- [ ] gateway / rate limiting / WAF
**DEPENDS ON**
- [ ] reliability under abuse
**RISK / VIOLATIONS**
- [ ] public invoker without throttling
**TEST / GUARD**
- [ ] smoke tests + rate limits (future)

---

## VI — User Ownership is Absolute

### VI.1 Export/Deletion/Audit Exists
**Definition:** User can export and delete all data; actions are auditable.

**ENFORCED BY**
- [ ] export + deletion pipelines
**DEPENDS ON**
- [ ] compliance & trust
**RISK / VIOLATIONS**
- [ ] partial deletion, orphaned docs
**TEST / GUARD**
- [ ] integration tests (future)

---

## VII — No UI Lies

### VII.1 UI Reflects System State Only
**Definition:** UI cannot fabricate readiness/completeness.

**ENFORCED BY**
- [ ] readiness contract gating UI
**DEPENDS ON**
- [ ] user trust
**RISK / VIOLATIONS**
- [ ] optimistic displays without server truth
**TEST / GUARD**
- [ ] UI state tests (future)

---

### VII.2 No UX Hacks for Correctness
**Definition:** No cache-bust/refreshBus as correctness mechanism.

**ENFORCED BY**
- [ ] removal of refresh hacks
**DEPENDS ON**
- [ ] long-term correctness
**RISK / VIOLATIONS**
- [ ] refreshBus usage in Command Center
**TEST / GUARD**
- [ ] lint rule to block refreshBus in app screens (future)

---

## VIII — Observability is Required

### VIII.1 Every Failure is Visible
**Definition:** Failures are logged and traceable end-to-end.

**ENFORCED BY**
- [ ] structured logs, error reporting
**DEPENDS ON**
- [ ] operability
**RISK / VIOLATIONS**
- [ ] silent retries, dropped events
**TEST / GUARD**
- [ ] log assertions (future)

---

## IX — Documents Match Reality

### IX.1 Code is Final Authority; Docs Must Update
**Definition:** Conflicts are resolved explicitly and docs updated.

**ENFORCED BY**
- [ ] PR checklist requirement
**DEPENDS ON**
- [ ] roadmap correctness
**RISK / VIOLATIONS**
- [ ] stale SYSTEM_STATE/ROADMAP_REALITY
**TEST / GUARD**
- [ ] CI: fail if doc version not bumped on key changes (future)

---

# Appendix — “Hot Files” (Do Not Touch Casually)

List files whose changes frequently impact multiple invariants.

- [ ] (fill in after audit)
