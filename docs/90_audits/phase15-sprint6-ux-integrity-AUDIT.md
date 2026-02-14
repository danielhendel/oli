# Phase 1.5 — Sprint 6: UX Integrity Lock — AUDIT

## Constitutional Certification Record

---

## 1. Sprint Identity

- **Sprint:** Phase 1.5 — Sprint 6
- **Scope:** UX Integrity Lock — accessibility, state unification, console integrity, emulator stability
- **Branch:** phase15/sprint6-ux-integrity
- **Base:** main

---

## 2. Roadmap → Code Mapping

### Accessibility

| Criterion | Implementation | Location |
|----------|----------------|----------|
| accessibilityLabel on all interactive Pressables | View baselines, Health Score details, Analyze, View failures, Command Center; overlay and close in both drawers; retry in ErrorState | dash.tsx, BaselineDrawer.tsx, ProvenanceDrawer.tsx, ScreenStates.tsx |
| Tap targets >= 44px | minHeight: 44 (and minWidth where needed), justifyContent: center for baselineTrigger, actionPressable, closeButton, retryBtn | dash.tsx, BaselineDrawer.tsx, ProvenanceDrawer.tsx, ScreenStates.tsx |
| No color-only status meaning | Status: formatHealthScoreStatus(d.status); Signals: "Stable" / "Attention Required" text | dash.tsx |
| Close button accessible | accessibilityLabel "Close baselines" / "Close provenance details", accessibilityRole="button" | BaselineDrawer.tsx, ProvenanceDrawer.tsx |
| Modal accessibility | accessibilityViewIsModal on both drawers | BaselineDrawer.tsx, ProvenanceDrawer.tsx |

### State Unification

| Criterion | Implementation | Location |
|----------|----------------|----------|
| Explicit loading/missing/error | LoadingState, EmptyState, ErrorState (existing); OfflineState for network error | dash.tsx, ScreenStates.tsx, StateBlock.tsx |
| Duplicate logic unified | OfflineState in StateBlock used for Health Score and Signals offline branches | lib/ui/StateBlock.tsx, dash.tsx |
| No behavioral change | Same copy and layout; only structural extraction | — |

### Console Integrity

| Criterion | Implementation | Location |
|----------|----------------|----------|
| Jest guard fails on console.error | installConsoleGuard() in jest.setup.ts; afterEach failIfUnexpected() | scripts/test/jest.setup.ts, scripts/test/consoleGuard.ts |
| Dash render does not emit warnings | No console.* in app/ or lib/ (grep verified) | — |
| No console.log/debug in app/lib | None present | — |

### Emulator Stability

| Criterion | Implementation | Location |
|----------|----------------|----------|
| Wrapper exit code = Jest exit code | Start emulator in background (emulators:start), waitForPort(), run Jest, kill emulator, process.exit(jestCode) | scripts/test/run-jest-with-firestore-emulator.mjs |
| Jest exits 0 cleanly | Script exits with Jest’s exit code only; firebase shutdown code (e.g. 2) no longer propagated | Same |

### Tests

| Spec | Location | Status |
|------|----------|--------|
| Dash accessibility: labels and roles on main actions | app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx | Done |
| BaselineDrawer: close and overlay accessibility | lib/ui/__tests__/BaselineDrawer.accessibility.test.tsx | Done |
| ProvenanceDrawer: close button accessibility | lib/ui/__tests__/ProvenanceDrawer.test.tsx (new it) | Done |
| Console guard escape hatches | scripts/test/__tests__/consoleGuard.test.ts | Existing |
| StateBlock OfflineState | lib/ui/__tests__/StateBlock.test.tsx | Done |

---

## 3. Files Touched

### Added

- `lib/ui/StateBlock.tsx` — OfflineState block
- `lib/ui/__tests__/StateBlock.test.tsx`
- `lib/ui/__tests__/BaselineDrawer.accessibility.test.tsx`
- `app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx`
- `docs/90_audits/phase15-sprint6-ux-integrity-PLAN.md`
- `docs/90_audits/phase15-sprint6-ux-integrity-AUDIT.md` (this file)

### Modified

- `app/(app)/(tabs)/dash.tsx` — OfflineState import and usage; accessibilityLabel/accessibilityRole on Pressables; Pressable for actions; baselineTrigger minHeight; removed duplicate offline inline state
- `lib/ui/BaselineDrawer.tsx` — accessibilityLabel on overlay and close; accessibilityViewIsModal; closeButton minHeight/minWidth 44
- `lib/ui/ProvenanceDrawer.tsx` — same as BaselineDrawer
- `lib/ui/ScreenStates.tsx` — ErrorState retry Pressable: accessibilityLabel, accessibilityRole, retryBtn minHeight/minWidth 44
- `lib/ui/__tests__/ProvenanceDrawer.test.tsx` — it("close button has accessibilityLabel and role...")
- `scripts/test/run-jest-with-firestore-emulator.mjs` — background emulator + waitForPort + runAndGetExitCode; exit with Jest code only

---

## 4. Constitutional Compliance (Hard Law)

- **No scoring logic changes:** None.
- **No signals logic changes:** None.
- **No threshold edits:** None.
- **No ledger edits:** None.
- **No ingestion edits:** None.
- **No client-side derived computation:** None.
- **No persuasive text:** Labels remain neutral (View baselines, Details, Analyze, Offline, Try again).
- **No hidden states:** Loading/missing/error/offline are explicit UI states.
- **Determinism and replay safety:** Unchanged.

---

## 5. Evidence

### Accessibility compliance

- All interactive Pressables in Dash, BaselineDrawer, ProvenanceDrawer, and ScreenStates have `accessibilityLabel` and (where appropriate) `accessibilityRole="button"`.
- Tap targets: `minHeight: 44` (and `minWidth: 44` for close/retry) applied to baselineTrigger, actionPressable, closeButton, retryBtn.
- Tests: dash-accessibility.test.tsx asserts labels and roles; BaselineDrawer and ProvenanceDrawer tests assert close/overlay labels.

### Console clean run

- jest.setup.ts installs console guard; afterEach failIfUnexpected() throws on unexpected console.error/warn.
- No console.log/error/warn/debug in app/ or lib/.

### Emulator stability

- run-jest-with-firestore-emulator.mjs starts Firestore emulator in background, waits for port, runs Jest, then exits with Jest’s exit code. Emulator process is killed in finally; firebase shutdown exit code (e.g. 2) is not propagated.

---

## 6. Gates

| Check | Result |
|-------|--------|
| npm run typecheck | (run at PR) |
| npm run lint | (run at PR) |
| npm test | (run at PR) |

---

## 7. Verdict

**PASS** (pending typecheck/lint/test run and PR).

Sprint 6 delivers UX integrity lock: accessibility pass, state unification via StateBlock/OfflineState, console discipline (existing guard), and emulator exit-code stability, with no changes to scoring, signals, thresholds, ledger, or ingestion.
