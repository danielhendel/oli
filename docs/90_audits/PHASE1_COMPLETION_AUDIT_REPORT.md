# Phase 1 Completion Audit Report — Oli Health OS

**Audit Date:** 2026-02-08  
**Auditor:** AI Audit (Auto)  
**Authority:** Phase 1 Completion Specification, Oli Constitution, PHASE_1_LOCK_CRITERIA  
**Scope:** End-to-end verification of Phase 1 "10/10 DONE" per plan

---

## A) Executive Summary

### Overall Status: **FAIL**

Phase 1 is **not** complete per the binding Phase 1 Completion Specification and PHASE_1_LOCK_CRITERIA. Multiple blocking gaps exist.

### Overall Grade: **5.5/10**

**Rubric basis:** Substantial structural and enforcement investment exists (CI invariants, proof gate, writeCanonicalEventImmutable, derived ledger, replay UI). However, critical spec-mandated capabilities are missing or incomplete: Day Index, As-Of day-truth contract, Privacy Policy UI, Delete Account UI, Ingestion boundary schema fields, and proof command verification.

### Top 5 Strengths (with evidence citations)

1. **Canonical immutability enforcement** — `writeCanonicalEventImmutable` in `services/functions/src/normalization/writeCanonicalEventImmutable.ts`; conflict recording to `integrityViolations`; CHECK 18 in `scripts/ci/check-invariants.mjs`; Firestore rules deny client writes to `events` (`services/functions/firestore.rules` lines 65–68).

2. **Derived ledger + replay** — `derived-ledger/snapshot` and `derived-ledger/runs` endpoints with `asOf` support; `writeDerivedLedgerRun` required by CHECK 19; Replay UI at `app/(app)/(tabs)/library/replay/day/[dayKey].tsx` shows "Viewing past truth as of …" and run selector.

3. **Fail-closed readiness resolver** — `resolveReadiness` in `lib/data/resolveReadiness.ts` with states `loading`/`empty`/`invalid`/`partial`/`ready`; used in Command Center (`app/(app)/command-center/index.tsx`); unit test `lib/data/__tests__/resolveReadiness.test.ts`.

4. **Constitutional invariant CI** — 19 checks in `scripts/ci/check-invariants.mjs`; proof gate `scripts/ci/proof-gate.sh`; CI workflow `.github/workflows/ci.yml` runs invariants, API route assert, UI route assert, proof gate; tag `sprint-6-phase1-proof-lock` points to HEAD.

5. **E2E proof test** — `services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts` proves ingest → recompute → dailyFacts visible → derived-ledger snapshot replayable; uses Firestore emulator; validates `derivedLedgerReplayResponseDtoSchema`.

### Top 5 Risks/Gaps (with evidence citations)

1. **Day Index missing** — Spec §2.1 requires `/users/{uid}/days/{YYYY-MM-DD}` with `eventsCount`, `kindsPresent[]`, `firstCanonicalEventAt`, `latestCanonicalEventAt`, `updatedAt`. **No such collection exists.** Timeline scans `events` per day (`services/api/src/routes/usersMe.ts` lines 578–618). **FAILURE.**

2. **day-truth asOf contract not implemented** — Spec §2.2 requires `GET /users/me/day-truth?day=YYYY-MM-DD&asOf=ISO` returning canonical events ≤ asOf, derived snapshots whose `latestCanonicalEventAt ≤ asOf`, and `state: "not-ready"` when no snapshot matches. Current `day-truth` (`usersMe.ts` lines 155–189) returns only `eventsCount` and `latestCanonicalEventAt`; no `asOf` parameter; no `state` field. **FAILURE.**

3. **Privacy Policy UI empty** — Spec §6 requires "In-app Privacy Policy screen." `app/(app)/settings/privacy.tsx` renders `{null}`. **FAILURE.**

4. **Delete Account flow not in app** — Spec §6 requires "Delete Account flow." API exists (`POST /account/delete` in `services/api/src/routes/account.ts`). No client UI found for "Delete account" in `app/`; `account.tsx` has Sign out only. **FAILURE.**

5. **Proof commands unverified** — `npm ci` failed (EPERM); `npm run typecheck` and `npm run lint` failed (missing node_modules / eslint). Tests and proof gate not executed. **UNVERIFIED.**

---

## B) Rubric + Grading Table

| Area | Weight | Score | Evidence | Failures/Gaps |
|------|--------|-------|----------|---------------|
| Core loop reliability (Sprint 0) | 12% | 8 | E2E proof test; ingest timezone fail-closed; writeCanonicalEventImmutable; recompute authoritative | Determinism tests exist but proof commands not run |
| Data accessibility (Sprint 1 endpoints) | 12% | 7 | assert-api-routes.mjs; raw-events, events, timeline, lineage, derived-ledger | day-truth lacks asOf; Day Index missing |
| Trust boundary integrity (Sprint 2) | 12% | 8 | resolveReadiness; TruthOutcome; Zod parsing in API; timeline-fail-closed.test.tsx | Some client calls may not fully gate on TruthOutcome |
| UI navigability (Sprint 3) | 10% | 8 | assert-ui-routes.mjs; tabs, timeline, library, event, lineage, replay | Privacy screen empty |
| Explainability (Sprint 4) | 8% | 8 | lineage/[canonicalEventId].tsx; provenance collapsed; auto-expand on failures | — |
| Determinism + replay (Sprint 5) | 12% | 7 | derived-ledger/snapshot asOf; replay UI; phase1Determinism.unit.test.ts | day-truth asOf not implemented |
| Institutional lock (Sprint 6) | 12% | 6 | proof-gate.sh; check-invariants; INVARIANT_ENFORCEMENT_MAP; tag sprint-6-phase1-proof-lock | PHASE_1_LOCK_DECLARATION unsigned; proof commands not run |
| Security/auth isolation | 10% | 9 | Firestore rules; auth middleware; CHECK 4, 14; Cloud Run not public | — |
| Test coverage quality | 6% | 6 | E2E proof; canonicalImmutability; ingest invalid-timezone; phase1Determinism | npm test not run |
| Documentation/audit completeness | 6% | 7 | docs/audit/phase1-completion/; endpoints.md; routes.md; ci-proof.md | AUDIT_REPO_TREE.txt missing |

**Weighted average:** ~7.0 → rounded to **5.5** after strict demotion for blocking gaps.

---

## C) Evidence-Based Verification Checklist

### Canonical Truth & Ingestion (Spec §1)

| Requirement | Source | File(s) | Route/Handler | Test | CI | Status |
|-------------|--------|---------|--------------|------|-----|--------|
| P1-S1-IMMUT-001: All canonical writes go through writeCanonicalEventImmutable | Spec §1.1 | `services/functions/src/normalization/onRawEventCreated.ts`, `writeCanonicalEventImmutable.ts` | — | `canonicalImmutability.test.ts` | CHECK 18 | **VERIFIED** |
| P1-S1-IMMUT-002: Prohibit .set()/.update() on events | Spec §1.1 | Firestore rules | — | — | CHECK 18 (code pattern) | **VERIFIED** |
| P1-S1-IMMUT-003: Conflict recording on hash mismatch | Spec §1.1 | `writeCanonicalEventImmutable.ts` lines 80–93 | integrityViolations | — | — | **VERIFIED** |
| P1-S1-IDEM-001: RawEvent includes provider, sourceType, sourceId, ingestRequestId, payloadHash | Spec §1.2 | `lib/contracts/rawEvent.ts` | — | — | — | **UNVERIFIED** — `ingestRequestId`, `payloadHash` not in schema |
| P1-S1-DEDUP-001: Duplicate evidence recorded | Spec §1.2 | `services/functions/src/ingestion/rawEventDedupe.ts` | — | `rawEventDedupe.test.ts` | — | **VERIFIED** |

### Timeline & Longitudinal Truth (Spec §2)

| Requirement | Source | File(s) | Route/Handler | Test | CI | Status |
|-------------|--------|---------|--------------|------|-----|--------|
| P1-S2-DAY-001: DayIndex exists at /users/{uid}/days/{YYYY-MM-DD} | Spec §2.1 | — | — | — | — | **FAILURE** — No Day Index |
| P1-S2-DAY-002: Timeline queries do not scan events | Spec §2.1 | `services/api/src/routes/usersMe.ts` | GET /timeline | — | — | **FAILURE** — Timeline scans events |
| P1-S2-REPLAY-001: GET day-truth?day=&asOf= returns canonical ≤ asOf, derived ≤ asOf | Spec §2.2 | — | — | — | — | **FAILURE** — asOf not supported on day-truth |
| P1-S2-REPLAY-002: state: "not-ready" when no snapshot matches | Spec §2.2 | — | — | — | — | **FAILURE** — no such state on day-truth |

### Derived Truth Pipeline (Spec §3)

| Requirement | Source | File(s) | Route/Handler | Test | CI | Status |
|-------------|--------|---------|--------------|------|-----|--------|
| P1-S3-RECOMP-001: Authoritative recompute (no merge: true) | Spec §3.1 | pipeline, dailyFacts, insights, intelligence | — | authoritativeRecompute.noMerge.test.ts | — | **VERIFIED** |
| P1-S3-LEDGER-001: derivedLedger structure | Spec §3.2 | `services/functions/src/pipeline/derivedLedger.ts` | — | — | CHECK 19 | **VERIFIED** |
| P1-S3-DET-001: Determinism tests | Spec §3.3 | `phase1Determinism.unit.test.ts` | — | hash equality | proof-gate | **VERIFIED** |

### Client Consumption & Trust (Spec §4)

| Requirement | Source | File(s) | Route/Handler | Test | CI | Status |
|-------------|--------|---------|--------------|------|-----|--------|
| P1-S4-READY-001: resolveReadiness with loading/empty/invalid/partial/ready | Spec §4.1 | `lib/data/resolveReadiness.ts` | — | resolveReadiness.test.ts | — | **VERIFIED** |
| P1-S4-PROV-001: computedAt, pipelineVersion, latestCanonicalEventAt visible | Spec §4.2 | command-center, replay | — | — | — | **VERIFIED** |

### Invariants & Integrity (Spec §5)

| Requirement | Source | File(s) | Route/Handler | Test | CI | Status |
|-------------|--------|---------|--------------|------|-----|--------|
| P1-S5-INV-001: INVARIANTS_MAP change → CI/runtime update | Spec §5.1 | — | — | — | CHECK 6 (INVARIANT_ENFORCEMENT_MAP) | **PARTIAL** — Different file; INVARIANTS_MAP vs INVARIANT_ENFORCEMENT_MAP |
| P1-S5-INT-001: integrityViolations, ingestionFailures | Spec §5.2 | `writeCanonicalEventImmutable.ts`, `rawEventDedupe.ts` | — | — | — | **VERIFIED** |

### Privacy & Launch Compliance (Spec §6)

| Requirement | Source | File(s) | Route/Handler | Test | CI | Status |
|-------------|--------|---------|--------------|------|-----|--------|
| P1-S6-PRIV-001: In-app Privacy Policy screen | Spec §6 | `app/(app)/settings/privacy.tsx` | — | — | — | **FAILURE** — Empty screen |
| P1-S6-DEL-001: Delete Account flow | Spec §6 | — | POST /account/delete exists | — | CHECK 5 | **FAILURE** — No client UI |
| P1-S6-EXP-001: Data export trigger | Spec §6 | — | POST /export exists | — | — | **UNVERIFIED** — No client UI found |

---

## D) Deep Dive Sections

### D1) API Audit

**Required endpoints (from plan + assert-api-routes.mjs):**

| Endpoint | Method | Zod Query | Zod Response | Fail-Closed | Pagination | Auth | Status |
|----------|--------|-----------|--------------|-------------|------------|------|--------|
| /raw-events | GET | rawEventsListQuerySchema | rawEventsListResponseDtoSchema | invalidDoc500 | cursor, limit | uid | **VERIFIED** |
| /events | GET | canonicalEventsListQuerySchema | canonicalEventsListResponseDtoSchema | invalidDoc500 | cursor, limit | uid | **VERIFIED** |
| /timeline | GET | timelineQuerySchema | timelineResponseDtoSchema | invalidDoc500 | — | uid | **VERIFIED** |
| /lineage | GET | lineageQuerySchema | lineageResponseDtoSchema | invalidDoc500 | — | uid | **VERIFIED** |
| /derived-ledger/snapshot | GET | replayQuerySchema (day, runId, asOf) | derivedLedgerReplayResponseDtoSchema | invalidDoc500 | — | uid | **VERIFIED** |
| /derived-ledger/runs | GET | day | derivedLedgerRunsResponseDtoSchema | invalidDoc500 | — | uid | **VERIFIED** |
| /day-truth | GET | day only | dayTruthDtoSchema | invalidDoc500 | — | uid | **PARTIAL** — No asOf |
| /export | POST | — | — | — | — | uid | **VERIFIED** |
| /account/delete | POST | — | — | — | — | uid | **VERIFIED** |

**CI route invariants:** `scripts/ci/assert-api-routes.mjs` (run after `npm run -w api build`). Checks compiled route table for required paths. Does not assert day-truth asOf.

### D2) Client Trust Audit

- **Zod parsing:** `apiGetZodAuthed`, `apiPostZodAuthed` in `lib/api/validate.ts`; dayTruthDtoSchema, timelineResponseDtoSchema, etc. used in `lib/api/usersMe.ts`.
- **TruthOutcome:** `truthOutcomeFromApiResult` in `lib/data/truthOutcome.ts`; used by hooks. SPRINT2 deliverable states "All use* hooks use truthOutcomeFromApiResult."
- **Invalid payload rejection:** `timeline-fail-closed.test.tsx` asserts ErrorState with "Data validation failed" when API returns contract error; no partial render.
- **Gap:** Not all hooks audited for consistent TruthOutcome usage.

### D3) UI Audit

**Required routes (assert-ui-routes.mjs):** All present.

| Route | File | Navigable | Fail-Closed | Provenance | Replay |
|-------|------|-----------|-------------|------------|--------|
| Tabs shell | _layout.tsx, dash, timeline, manage, library, stats | ✓ | — | — | — |
| Timeline | index, [day] | ✓ | timeline-fail-closed.test.tsx | — | — |
| Library | index, [category] | ✓ | — | — | — |
| Event detail | event/[id] | ✓ | — | — | — |
| Lineage | lineage/[canonicalEventId] | ✓ | isContractError → ErrorState | autoExpandProvenance | — |
| Replay | replay/day/[dayKey] | ✓ | isContractError → ErrorState | Provenance collapsible | "Viewing past truth as of …" |

**Provenance collapsed by default:** LineageSection `defaultExpanded={autoExpandProvenance}`; auto-expands on failures/anomalies. **VERIFIED.**

**Replay UI:** Banner shows "Viewing past truth as of …"; run selector exists. **VERIFIED.**

### D4) Replay/Determinism Audit

- **Snapshot endpoint:** GET /derived-ledger/snapshot with day, runId, asOf. **VERIFIED.**
- **"Past views never change":** Replay UI copy; derived ledger append-only; snapshot by runId/asOf. **VERIFIED** (conceptually).
- **E2E proof:** `phase1E2E.logRecomputeVisibleReplay.test.ts` logs weight → recomputes → dailyFacts visible → snapshot replayable. **VERIFIED.**
- **Gap:** day-truth asOf (spec §2.2) not implemented; "Was day D fully known as of time T?" not answerable via day-truth.

### D5) Proof & Lock Audit

- **docs/audit/phase1-completion/:** Exists: README.md, endpoints.md, routes.md, ci-proof.md, screenshots.md, sample-payloads/. **VERIFIED.**
- **CI workflow:** `.github/workflows/ci.yml` runs invariants, assert-api-routes, assert-ui-routes, proof-gate. **VERIFIED.**
- **Tag sprint-6-phase1-proof-lock:** Points to HEAD (82b5cc7bc531c8864a5153dc8028d3877c3f2a73). **VERIFIED.**
- **PHASE_1_LOCK_DECLARATION.md:** Exists but **unsigned** (Commit Hash, Date, Sign-Off blank). **FAILURE.**

---

## E) E2E Proof Test Audit

**File:** `services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts`

**Assertions:**
1. Ingest returns 202, body has ok, rawEventId, day. ✓
2. recomputeDerivedTruthForDay invoked. ✓
3. dailyFacts returned, body.weightKg === 80. ✓
4. derived-ledger/snapshot returns 200, parsed by derivedLedgerReplayResponseDtoSchema. ✓
5. day, runId, computedAt, pipelineVersion, dailyFacts.body.weightKg present. ✓
6. Non-empty derived content. ✓

**Schema validation:** Uses `derivedLedgerReplayResponseDtoSchema.safeParse`. ✓

**Flakiness:** Uses fixed DAY_KEY, IDEMPOTENCY_KEY; no timers. ✓

**Emulator:** Requires FIRESTORE_EMULATOR_HOST. ✓

**Gap:** Does not assert "replay before and after backfill differ without mutation" (spec §2.2). Does not test asOf time travel.

**Grade:** 8/10 — Strong proof of log → recompute → visible → replayable; missing asOf replay scenario.

---

## F) Findings, Risks, and Remediation Plan

### Blockers (P0)

| ID | Severity | Evidence | Fix | Sprint |
|----|----------|----------|-----|--------|
| F1 | P0 | Spec §2.1; no /users/{uid}/days/ | Add DayIndex collection; maintain on canonical write; timeline reads from DayIndex | Phase 1 patch |
| F2 | P0 | Spec §2.2; day-truth has no asOf | Extend day-truth to accept asOf; return state + canonical/derived filtered by asOf | Phase 1 patch |
| F3 | P0 | Spec §6; privacy.tsx renders {null} | Implement Privacy Policy content (link or inline) | Phase 1 patch |
| F4 | P0 | Spec §6; no Delete Account UI | Add Delete Account flow in settings/account or dedicated screen | Phase 1 patch |

### Non-Blockers (P1)

| ID | Severity | Evidence | Fix | Sprint |
|----|----------|----------|-----|--------|
| F5 | P1 | RawEvent schema lacks ingestRequestId, payloadHash | Add fields to rawEventDocSchema; ingestion writes them | Phase 1 patch |
| F6 | P1 | Data export not surfaced in app | Add export trigger in settings | Phase 1 patch |
| F7 | P1 | PHASE_1_LOCK_DECLARATION unsigned | Complete and sign declaration | Phase 1 patch |
| F8 | P1 | Proof commands not run | Run npm ci, typecheck, lint, test in clean env | Verification |

### P2

| ID | Severity | Evidence | Fix |
|----|----------|----------|-----|
| F9 | P2 | AUDIT_REPO_TREE.txt missing | Add to docs/audit or docs/90_audits |
| F10 | P2 | INVARIANTS_MAP vs INVARIANT_ENFORCEMENT_MAP | Align spec §5.1 with CHECK 6 file |

---

## G) Final Determination

**Is Phase 1 "undeniably done" per plan definition?** **No.**

**Exact criteria missing:**
1. Day Index (§2.1) — non-existent.
2. day-truth asOf contract (§2.2) — not implemented.
3. In-app Privacy Policy screen (§6) — empty.
4. Delete Account flow (§6) — no client UI.
5. Proof commands (typecheck, lint, test) — not executed successfully.
6. PHASE_1_LOCK_DECLARATION — unsigned.

**Missing Evidence (UNVERIFIED):**
- AUDIT_REPO_TREE.txt
- npm ci output
- npm run typecheck output (pass)
- npm run lint output (pass)
- npm test -- --ci output (pass)
- CI workflow run logs (local or remote)

---

*End of audit report.*
