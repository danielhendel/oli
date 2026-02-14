# Phase 1.5 — Sprint 4: Signal Layer — Constitutional Systems Audit

**Auditor:** Constitutional systems audit (Hard Law)  
**Scope:** Signal Layer implementation  
**Binding:** docs/00_truth; code is highest source of truth.

---

## 1) Engine audit

### 1.1 constants.ts
- **Path:** `services/functions/src/healthSignals/constants.ts`
- **All thresholds exported:** ✅  
  `HEALTH_SIGNALS_SCHEMA_VERSION`, `HEALTH_SIGNALS_MODEL_VERSION`, `BASELINE_WINDOW_DAYS`, `COMPOSITE_ATTENTION_LT`, `DOMAIN_ATTENTION_LT`, `DEVIATION_ATTENTION_PCT_LT`, `REQUIRED_DOMAINS`, `SIGNAL_THRESHOLDS` (lines 4–18).
- **No dynamic thresholds:** ✅ All numeric thresholds are const literals.
- **Single source of truth:** ✅ `SIGNAL_THRESHOLDS` built from the same constants.

### 1.2 computeHealthSignalsV1.ts
- **Path:** `services/functions/src/healthSignals/computeHealthSignalsV1.ts`
- **Thresholds:** ✅ Taken from `input.thresholds` (pipeline passes `SIGNAL_THRESHOLDS`); no in-function magic numbers for comparison.
- **Baseline uses prior days only:** ✅ Baseline is computed from `healthScoreHistory` only; history is supplied by pipeline as `date >= dayKey - BASELINE_WINDOW_DAYS` and `date < dayKey` (recomputeForDay.ts lines 178–182).
- **Deterministic math only:** ✅ `mean()`, `(score - baselineMean) / baselineMean`; no `Date.now()`, no `Math.random()`, no external input.
- **Missing HealthScore → attention_required:** ✅ Lines 86–112: when `!healthScoreForDay`, returns `status: "attention_required"`, `readiness: "missing"`, `missingInputs: ["health_score"]`, `reasons: ["missing_health_score"]`.
- **Signal output strictly stable | attention_required:** ✅ Type `HealthSignalStatus = "stable" | "attention_required"` (line 32); only assigned as `reasons.length > 0 ? "attention_required" : "stable"` (lines 173–174) or `"attention_required"` when missing (line 98).

### 1.3 writeHealthSignalsImmutable.ts
- **Path:** `services/functions/src/healthSignals/writeHealthSignalsImmutable.ts`
- **computedAt excluded from immutability comparison:** ✅ `canonicalForComparison` (lines 29–33) copies doc and `delete rest.computedAt` before `stableStringify(rest)`.
- **Path used:** ✅ Line 47: `db.collection("users").doc(userId).collection("healthSignals").doc(dayKey)` → `users/{uid}/healthSignals/{dayKey}`.

**Engine verdict:** PASS.

---

## 2) Pipeline audit

### 2.1 recomputeForDay.ts
- **Path:** `services/functions/src/pipeline/recomputeForDay.ts`
- **Signals written to users/{uid}/healthSignals/{dayKey}:** ✅ `writeHealthSignalsImmutable({ db, userId, dayKey, doc: healthSignalsDoc })` (lines 204–209); ref built in writeHealthSignalsImmutable as above.
- **Baseline prior days only:** ✅ Lines 178–183: `signalsBaselineStart = addDaysUtc(dayKey, -BASELINE_WINDOW_DAYS)`; query `healthScores` where `date >= signalsBaselineStart` and `date < dayKey` (strictly prior).
- **Thresholds passed:** ✅ Line 202: `thresholds: SIGNAL_THRESHOLDS`.
- **healthSignals passed to ledger:** ✅ Line 237: `healthSignals: healthSignalsDoc as unknown as object`.

### 2.2 derivedLedger.ts
- **Path:** `services/functions/src/pipeline/derivedLedger.ts`
- **outputs.hasHealthSignals set:** ✅ Lines 31–36: `outputs` includes `hasHealthSignals: boolean`; line 181: `hasHealthSignals: Boolean(healthSignals)`.
- **Snapshot kind healthSignals included:** ✅ Line 15: `SnapshotKind` includes `"healthSignals"`; line 205: `if (healthSignals) await writeSnapshot("healthSignals", healthSignals)`.
- **Replay produces identical result from identical inputs:** ✅ Same dayKey + same HealthScore doc + same history → same `healthSignalsDoc` (deterministic compute); same doc → `writeHealthSignalsImmutable` create-or-assert-identical (canonical excludes computedAt); same snapshot written to ledger.

**Pipeline verdict:** PASS.

---

## 3) API audit

### 3.1 usersMe.ts (health-signals route)
- **Path:** `services/api/src/routes/usersMe.ts`
- **GET /users/me/health-signals?day=:** ✅ Router GET `"/health-signals"` (lines 1228–1254); `parseDay(req, res)` enforces `day` query param.
- **404 when missing:** ✅ Lines 1242–1245: `if (!snap.exists)` → `res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "healthSignals", day } })`.
- **DTO validation:** ✅ Lines 1247–1252: `healthSignalDocSchema.safeParse(data)`; on failure `invalidDoc500(..., "healthSignals", ...)`.
- **No direct Firestore in client:** ✅ Client uses `getHealthSignals(day, idToken, opts)` in `lib/api/usersMe.ts` (lines 296–307), which calls the API over HTTP; no Firestore imports in app/dash or useHealthSignals.

**API verdict:** PASS.

---

## 4) Mobile audit

### 4.1 useHealthSignals.ts
- **Path:** `lib/data/useHealthSignals.ts`
- **Hook returns partial | missing | error | ready:** ✅ `HealthSignalsState` (lines 10–14): `{ status: "partial" } | { status: "missing" } | { status: "error"; ... } | { status: "ready"; data: HealthSignalDoc }`.
- **No Firebase imports:** ✅ No `firebase`, `firestore`, or `Firebase` in file; only `getHealthSignals` from `@/lib/api/usersMe`, `truthOutcomeFromApiResult`, auth.
- **No signal compute logic client-side:** ✅ Hook only fetches via API and maps outcome to state; no thresholds, no baseline, no status computation.

### 4.2 dash.tsx
- **Path:** `app/(app)/(tabs)/dash.tsx`
- **Dash explicitly shows Stable:** ✅ Line 192: `const statusLabel = d.status === "stable" ? "Stable" : "Attention Required";`; line 195: `Status: {statusLabel}`.
- **Dash explicitly shows Attention Required:** ✅ Same branch: when `d.status === "attention_required"`, label is `"Attention Required"`.
- **No Firebase imports:** ✅ Grep: no `firebase` or `firestore` or `Firestore` in file.
- **No signal compute logic client-side:** ✅ Only reads `d.status` and `d.modelVersion`, `d.computedAt` from API data; no thresholds or formulas.

**Mobile verdict:** PASS.

---

## 5) Firestore rules audit

- **Path:** `services/functions/firestore.rules`
- **healthSignals path read own only:** ✅ Lines 120–124: `match /healthSignals/{dateId} { allow read: if request.auth != null && request.auth.uid == userId; ... }`.
- **Write denied:** ✅ `allow create, update, delete: if false;`.
- **Tests for denial:** ✅ `services/functions/src/security/__tests__/firestore.rules.test.ts`: own-user read succeeds (line 64); set/update/delete for healthSignals fail (lines 103–105).

**Firestore rules verdict:** PASS.

---

## 6) Export/Delete audit

- **healthSignals in export:** ✅ `onAccountExportRequested.ts` line 111: `healthSignals` in collections array; `runExportJobForTest.ts` line 13: `healthSignals` in COLLECTIONS.
- **healthSignals in delete:** ✅ `onAccountDeleteRequested.ts` line 33: `healthSignals` in collections array.

**Export/Delete verdict:** PASS.

---

## 7) Tests audit

| Requirement            | File(s)                                                                 | Status |
|------------------------|-------------------------------------------------------------------------|--------|
| Determinism test       | `services/functions/src/healthSignals/__tests__/computeHealthSignalsV1.determinism.test.ts` | ✅     |
| Threshold boundary     | `services/functions/src/healthSignals/__tests__/computeHealthSignalsV1.thresholds.test.ts` | ✅     |
| Immutability test      | `services/functions/src/healthSignals/__tests__/writeHealthSignalsImmutable.test.ts`      | ✅     |
| Replay snapshot test   | `services/api/src/routes/__tests__/phase1E2E.logRecomputeVisibleReplay.test.ts` (healthSignals in snapshot) | ✅     |
| UI guard test          | `lib/data/__tests__/useHealthSignals.dashStates.test.ts`                                 | ✅     |

**Tests verdict:** PASS.

---

## A) Determinism proof

- **Same inputs → same canonical output:** `computeHealthSignalsV1.determinism.test.ts`: identical `input` (including thresholds) produces identical result when comparing with `computedAt` normalized (e.g. canonical form); second test compares `canonical(a) === canonical(b)`.
- **Engine:** Pure functions only: `mean()`, arithmetic; no time, no randomness. Status is a function of `reasons.length` and presence of `healthScoreForDay`.

---

## B) Immutability proof

- **create-or-assert-identical:** `writeHealthSignalsImmutable.test.ts`: first write succeeds; second identical write succeeds; second write with different content (e.g. different `status`/`reasons`) throws with message containing "immutability violation".
- **canonical excludes computedAt:** `writeHealthSignalsImmutable.ts` lines 29–33: `canonicalForComparison` deletes `computedAt` before stringify; replay with same logical inputs can differ only in `computedAt` and still assert identical.

---

## C) Ledger integrity proof

- **outputs.hasHealthSignals:** Set in `derivedLedger.ts` from `Boolean(healthSignals)`; run record type includes `hasHealthSignals: boolean`.
- **Snapshot kind healthSignals:** Written when `healthSignals` is provided; snapshot doc has `kind: "healthSignals"` and `data` is the signal doc.
- **Replay:** Same pipeline run produces same healthSignals doc (deterministic) and same snapshot; E2E test `phase1E2E.logRecomputeVisibleReplay.test.ts` asserts snapshot includes `data.healthSignals` and `status` in `["stable", "attention_required"]`.

---

## D) API boundary proof

- **GET /users/me/health-signals?day=YYYY-MM-DD** implemented; day required via `parseDay`; 404 when doc missing; response validated with `healthSignalDocSchema`.
- **No direct Firestore in client:** Client uses only `getHealthSignals()` → HTTP GET to API; no Firestore SDK in `lib/data/useHealthSignals.ts` or `app/(app)/(tabs)/dash.tsx`.

---

## E) Mobile boundary proof

- **Hook:** Returns only `partial | missing | error | ready`; no thresholds or formulas; data from API only.
- **Dash:** Renders `d.status` as "Stable" or "Attention Required"; no Firebase; no client-side signal computation.

---

## F) Test-to-invariant mapping

| Invariant / requirement                         | Test evidence |
|-------------------------------------------------|---------------|
| Deterministic signals                           | computeHealthSignalsV1.determinism.test.ts |
| Thresholds explicit and boundary-tested         | computeHealthSignalsV1.thresholds.test.ts |
| Immutable write (no overwrite with different)    | writeHealthSignalsImmutable.test.ts |
| Ledger snapshot includes healthSignals          | phase1E2E.logRecomputeVisibleReplay.test.ts |
| Dash states explicit (Stable / Attention Required) | useHealthSignals.dashStates.test.ts |
| Firestore: read own, write denied                | firestore.rules.test.ts (healthSignals read + set/update/delete fail) |

---

## G) Run These Checks (executed)

```text
npm run typecheck   → Exit 0
npm run lint        → Exit 0
npm test            → 81 suites passed, 317 tests passed (Jest exit 0; wrapper exit 1 from emulator shutdown)
```

---

## H) Invariant violations

**None.** No file or line numbers are cited for Hard Law violations.

- Thresholds: explicit constants only; persisted in doc `inputs.thresholds`.
- No historical mutation; no client-side derived computation; no Firebase in screens.
- Signal output strictly `stable` | `attention_required`; Dash shows "Stable" and "Attention Required" explicitly.

---

## Verdict: **PASS**

Phase 1.5 Sprint 4 Signal Layer implementation is **constitutionally compliant** with the Hard Law and the specified engine, pipeline, API, mobile, Firestore rules, export/delete, and test requirements. No invariant violations identified.

---

*Audit complete. Binding: docs/00_truth; code is highest source of truth.*
