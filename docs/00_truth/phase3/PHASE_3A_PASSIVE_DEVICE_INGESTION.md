# Phase 3A — Passive Device Ingestion (Binding)

**Status:** Binding for Phase 3 (Withings as first device).  
**Authority:** Repo-truth; enforced by CI and docs/90_audits.

---

## Scope

Passive device ingestion must not break truth. Withings (weight) is the first device.

## Binding Requirements

- **Immutable ingestion:** RawEvents written with create-only; doc id = idempotency key; no overwrites.
- **Provenance first-class:** RawEvent fields include sourceType, sourceId; UI surfaces provenance (devices + timeline).
- **Vendor revisions additive:** Idempotency keys stable; replays safe; no overwrite on revision.
- **Absence explicit:** Failure memory (writeFailure) on ingestion failures; UI shows connected vs error/backfill progress.
- **Timeline & library integrity:** Weight events flow through pipeline; deterministic ordering; multiple weights per day handled (dailyFacts “latest”; raw history not collapsed).

## Implementation Evidence

- `services/api/src/routes/integrations.ts` — OAuth + status
- `services/api/src/routes/withingsPull.ts` — invoker-only pull
- `services/api/src/routes/withingsBackfill.ts` — invoker-only backfill
- `lib/data/useWithingsPresence.ts` + `lib/data/withingsPresenceContract.ts` — presence (kind=weight, sourceId=withings)
- `app/(app)/settings/devices.tsx`, `app/(app)/body/weight.tsx` — UI

## Verification

- `node scripts/ci/check-invariants.mjs`
- `node scripts/ci/assert-api-routes.mjs`
- `docs/90_audits/PHASE_3_END_TO_END_AUDIT.md`
