# Phase 1.5 — Sprint 6: UX Integrity Lock — PLAN

## Goal

Polish Dash to feel stable, neutral, and trustworthy. Enforce accessibility, loading/error clarity, and console integrity. No changes to scoring, signals, thresholds, ledger, ingestion, or client-side derived computation.

---

## Hard Law (No Changes)

- No changes to scoring logic.
- No changes to signals logic.
- No threshold edits.
- No ledger edits.
- No ingestion edits.
- No client-side derived computation.
- No persuasive text.
- No hidden states.
- Preserve determinism and replay safety.

---

## File Paths & Steps

### 1) Accessibility Pass

| Step | Action | Path |
|------|--------|------|
| 1.1 | Audit Dash: accessibilityLabel on all interactive Pressables | `app/(app)/(tabs)/dash.tsx` |
| 1.2 | Tap targets >= 44px (minHeight/minWidth or padding) for Pressables | dash, BaselineDrawer, ProvenanceDrawer, ScreenStates |
| 1.3 | No color-only status meaning (status conveyed by text as well) | Already satisfied |
| 1.4 | Close button accessible (label + role) | `lib/ui/BaselineDrawer.tsx`, `lib/ui/ProvenanceDrawer.tsx` |
| 1.5 | Replace Text onPress with Pressable for actions (View failures, Command Center) | `app/(app)/(tabs)/dash.tsx` |
| 1.6 | ErrorState retry button: accessibilityLabel, tap target | `lib/ui/ScreenStates.tsx` |
| 1.7 | Add accessibility tests | `app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx`, drawer tests |

### 2) State Unification

| Step | Action | Path |
|------|--------|------|
| 2.1 | Explicit states: loading (LoadingState), missing (EmptyState), error (ErrorState/OfflineState) | Already in dash |
| 2.2 | If duplicate logic exists, create StateBlock | `lib/ui/StateBlock.tsx` |
| 2.3 | Offline state block unified (OfflineState) | Used in HealthScore + Signals error/network branch |
| 2.4 | No behavioral change, only structural clarity | — |

### 3) Console Integrity

| Step | Action | Path |
|------|--------|------|
| 3.1 | Jest guard already fails if console.error called (jest.setup.ts + consoleGuard) | `scripts/test/jest.setup.ts`, `scripts/test/consoleGuard.ts` |
| 3.2 | Ensure Dash render does not emit warnings | No console in app/lib |
| 3.3 | Remove all console.log/debug in app and lib | Audit: none found |

### 4) Emulator Stability

| Step | Action | Path |
|------|--------|------|
| 4.1 | Investigate wrapper exit code 2 after emulator shutdown | `scripts/test/run-jest-with-firestore-emulator.mjs` |
| 4.2 | Start emulator in background; run Jest; exit with Jest exit code only | Same script |
| 4.3 | Ensure Jest exits 0 cleanly (no firebase shutdown code propagation) | Same script |

### 5) Tests

| Step | Action | Path |
|------|--------|------|
| 5.1 | Add accessibility test (labels, roles on Dash and drawers) | `dash-accessibility.test.tsx`, `BaselineDrawer.accessibility.test.tsx`, ProvenanceDrawer test |
| 5.2 | Console guard test already exists | `scripts/test/__tests__/consoleGuard.test.ts` |
| 5.3 | StateBlock OfflineState test | `lib/ui/__tests__/StateBlock.test.tsx` |
| 5.4 | Ensure existing tests pass | — |

### 6) Documentation

| Step | Action | Path |
|------|--------|------|
| 6.1 | Create PLAN | `docs/90_audits/phase15-sprint6-ux-integrity-PLAN.md` |
| 6.2 | Create AUDIT | `docs/90_audits/phase15-sprint6-ux-integrity-AUDIT.md` |
| 6.3 | Map roadmap criteria to code | In AUDIT |

---

## Run These Checks

```bash
npm run typecheck
npm run lint
npm test
```

Branch: `phase15/sprint6-ux-integrity`  
PR: into `main`.

---

## Roadmap Criteria (Sprint 6)

| Criterion | Implementation |
|-----------|----------------|
| accessibilityLabel on all interactive Pressables | dash.tsx, BaselineDrawer, ProvenanceDrawer, ScreenStates |
| Tap targets >= 44px | styles: baselineTrigger, actionPressable, closeButton, retryBtn |
| No color-only status meaning | Status text present (formatHealthScoreStatus, Stable/Attention Required) |
| Close button accessible | accessibilityLabel + accessibilityRole="button" on both drawers |
| Explicit loading/missing/error states | LoadingState, EmptyState, ErrorState, OfflineState (StateBlock) |
| Console guard fails on console.error | jest.setup.ts installConsoleGuard; afterEach failIfUnexpected |
| No console.log/debug in app/lib | Grep: none |
| Jest exits 0 cleanly | run-jest-with-firestore-emulator: background emulator, run Jest, exit(jestCode) |
