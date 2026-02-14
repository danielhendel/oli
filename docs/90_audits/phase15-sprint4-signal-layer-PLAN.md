# Phase 1.5 — Sprint 4: Signal Layer — Implementation Plan

**Binding:** docs/00_truth + spec in user request. Code is highest source of truth.

---

## 1. File change checklist

### Backend (Functions)

| # | Action | Exact path |
|---|--------|------------|
| 1 | ADD | `services/functions/src/healthSignals/constants.ts` |
| 2 | ADD | `services/functions/src/healthSignals/computeHealthSignalsV1.ts` |
| 3 | ADD | `services/functions/src/healthSignals/writeHealthSignalsImmutable.ts` |
| 4 | EDIT | `services/functions/src/pipeline/derivedLedger.ts` — add `hasHealthSignals`, snapshot kind `healthSignals` |
| 5 | EDIT | `services/functions/src/pipeline/recomputeForDay.ts` — load HealthScore + history, compute signals, write signals, pass to ledger |

### Contracts

| # | Action | Exact path |
|---|--------|------------|
| 6 | ADD | `lib/contracts/healthSignals.ts` — HealthSignalDoc v1 schema |
| 7 | EDIT | `lib/contracts/index.ts` — export healthSignals |

### API

| # | Action | Exact path |
|---|--------|------------|
| 8 | EDIT | `services/api/src/types/dtos.ts` — export healthSignalDocSchema / HealthSignalDoc |
| 9 | EDIT | `services/api/src/routes/usersMe.ts` — GET `/health-signals?day=YYYY-MM-DD` |
| 10 | EDIT | `lib/api/usersMe.ts` — add `getHealthSignals(dayKey, idToken, opts?)` |

### Mobile

| # | Action | Exact path |
|---|--------|------------|
| 11 | ADD | `lib/data/useHealthSignals.ts` — hook (partial | missing | error | ready) |
| 12 | EDIT | `app/(app)/(tabs)/dash.tsx` — signals block (Stable / Attention Required / Missing / Offline-Error) |

### Tests

| # | Action | Exact path |
|---|--------|------------|
| 13 | ADD | `services/functions/src/healthSignals/__tests__/computeHealthSignalsV1.determinism.test.ts` |
| 14 | ADD | `services/functions/src/healthSignals/__tests__/computeHealthSignalsV1.thresholds.test.ts` |
| 15 | ADD | `services/functions/src/healthSignals/__tests__/writeHealthSignalsImmutable.test.ts` |
| 16 | ADD/EDIT | Replay proof: test that derived ledger snapshot includes healthSignals and outputs.hasHealthSignals |
| 17 | ADD | Mobile: test that hook states map to explicit dash states (fail-closed UI guard) |

### Security / Config

| # | Action | Exact path |
|---|--------|------------|
| 18 | EDIT | `services/functions/firestore.rules` — add `healthSignals/{dateId}` read-only for user |

---

## 2. Run These Checks (after implementation)

```bash
# From repo root
npm run typecheck
npm run lint
npm test
```

All must pass. No HealthScore mutations; no client-side signal computation; no Firebase in dash screen.

---

## 3. Key invariants (no guessing)

- **Storage path:** `users/{uid}/healthSignals/{dayKey}` (not healthScores).
- **Immutability:** create-or-assert-identical; exclude `computedAt` from comparison (canonicalForComparison).
- **Outputs:** status `stable` | `attention_required` only; UI labels: Stable / Attention Required.
- **Readiness:** `missing` | `partial` | `ready` | `error` (existing vocabulary).
- **Thresholds:** single source in constants; persisted in signal doc `inputs.thresholds`.
- **Fail-closed:** missing inputs → status `attention_required`, `missingInputs` populated.
- **Stable must be explicit:** stored and shown on Dash (never silent).
- **Baseline:** server-side from HealthScore history (prior 14 days); do not reuse UI baseline helpers.

---

## 4. Signal algorithm (summary)

1. **Missing HealthScore for dayKey** → readiness `missing`, status `attention_required`, `missingInputs: ["health_score"]`.
2. **HealthScore present:** load HealthScores for `[dayKey - BASELINE_WINDOW_DAYS, dayKey)` (prior 14 days).
3. **Baseline:** mean composite, mean per domain over that window (server-side only).
4. **Evaluate:**  
   - composite < COMPOSITE_ATTENTION_LT (65) → add reason, attention.  
   - any required domain score < DOMAIN_ATTENTION_LT (60) → add reason, attention.  
   - deviation (today - baselineMean)/baselineMean < DEVIATION_ATTENTION_PCT_LT (-0.15) for composite or domain → add reason, attention.  
5. **Else** status `stable`; write and show explicitly.

---

*Plan locked. Implement exactly.*
