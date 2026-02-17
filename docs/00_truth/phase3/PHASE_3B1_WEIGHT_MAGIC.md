# Phase 3B.1 — Weight Magic (Binding)

**Status:** Binding for Phase 3B.1 (backfill + progress UI; Step 2 = trends/insights).  
**Authority:** Repo-truth; enforced by CI and docs/90_audits.

---

## Step 1 Scope (Binding)

- **Backfill engine:** POST /integrations/withings/backfill invoker-only; start/resume/stop; cursor on integration doc; resume-safe; FailureEntry + status error on failures.
- **Progress UI:** Devices screen shows status/progress/error; weight screen shows “Importing…” banner; client does NOT call invoker endpoints.
- **Automation:** Backfill starts automatically after connect (OAuth callback + status-handler one-time init); scheduled function runs resume every 15 minutes until complete.
- **Presence:** Withings weight queried as kind=weight, filtered by sourceId=withings; hasRecentData/lastMeasurementAt reflect device data.

## Implementation Evidence

- `services/api/src/routes/withingsBackfill.ts`
- `services/api/src/routes/integrations.ts` — auto-start in callback + status
- `services/functions/src/withings/onWithingsBackfillScheduled.ts` — onSchedule
- `lib/data/useWithingsPresence.ts`, `lib/data/withingsPresenceContract.ts`
- `app/(app)/settings/devices.tsx`, `app/(app)/body/weight.tsx`

## Verification

- `node scripts/ci/check-invariants.mjs`
- `node scripts/ci/assert-api-routes.mjs`
- `docs/90_audits/PHASE_3_END_TO_END_AUDIT.md`, `docs/90_audits/PHASE_3_CERTIFICATION_RECORD.md`
