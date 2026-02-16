 # 🔗 Phase 3A Integration Strategy

 ## Scope

**Phase 3A** introduces **first-class ingestion** from:

- **Withings**
- **Oura**
- **Apple Health**
- **MyFitnessPal (MFP)**

This document is **binding** for Phase 3A integrations. All ingestion work **must** conform to this strategy or explicitly supersede it in a future locked doc.

---

## Device Order (Onboarding & Implementation)

The **implementation and rollout order** for Phase 3A is:

1. **Withings**
2. **Oura**
3. **Apple Health**
4. **MyFitnessPal** (MFP)

Each later device may assume all previous devices' **infrastructure, invariants, and patterns** exist and are stable.

---

## Common Ingestion Principles

For all Phase 3A devices:

- **Single front door**:
  - All external device data enters via a **single ingestion front door** (e.g. an `ExternalDeviceRawEvent` pipeline) rather than ad‑hoc per‑vendor code paths.
  - Device‑specific transforms happen **behind** that front door, not at arbitrary call sites.

- **RawEvent kind naming**:
  - Each vendor maps into **explicit, vendor‑scoped `RawEvent` kinds**, e.g.:
    - `withings.body_measurement`
    - `oura.sleep_summary`
    - `apple_health.workout`
    - `mfp.meal_log`
  - Kinds must:
    - Be **lowercase**, **snake_case**, `vendor.<domain>` style.
    - Be **append-only**; renames require a **migration strategy doc**.

- **Provenance & lineage (required fields)**:
  - `vendor`: `"withings" | "oura" | "apple_health" | "mfp"`.
  - `vendor_source`: human‑readable subsystem (e.g. `"measurements_api"`, `"cloud_api"`, `"healthkit_export"`).
  - `vendor_user_id`: opaque vendor user identifier (if available).
  - `vendor_device_id`: opaque physical device / sensor identifier (if available).
  - `vendor_payload_revision`: opaque vendor revision / version token (see below).
  - `ingestion_channel`: `"server_oauth" | "on_device" | "manual_export"`.
  - `ingested_at`: server timestamp of ingestion.
  - `occurred_at` / `recorded_at`: mapped into Phase 2 semantics.
  - `import_batch_id`: identifier for batch imports / replays.

- **Vendor revision handling**:
  - `vendor_payload_revision` is **mandatory** wherever the vendor exposes:
    - an explicit revision/version number,
    - an `etag` / sync token,
    - or a last‑modified timestamp distinct from occurrence time.
  - On re‑ingestion:
    - If `vendor_payload_revision` is **identical**, we **do not mutate** existing immutable events; at most we record an idempotent re‑seen marker.
    - If `vendor_payload_revision` **changes**, we **append** a new `RawEvent` with preserved lineage back to the original (Phase 2 immutability).

- **“Expected but missing” handling**:
  - For time windows where a device is **expected** to produce data but does not, we:
    - Represent this as **explicit absence**, not silent nothingness.
    - Emit **absence markers** or **coverage metadata** (e.g. “Withings weight expected daily, last seen 3 days ago”).
  - Absence **does not fabricate events** and must remain compatible with Phase 2:
    - No fake measurements.
    - No auto‑filled gaps.
    - UI must present “missing” as missing, not as zero / normal.

---

## Device‑Specific Strategy

### 1. Withings

- **Source**:
  - Withings cloud APIs (measurements, sleep, activity).

- **Auth model**:
  - **Server OAuth** (3‑legged):
    - OAuth dance executed via client, token storage & refresh handled in **server**.
    - No long‑lived access tokens are persisted on the device.

- **Ingestion path (single front door)**:
  - Webhook / polling → **Withings adapter** → **single ingestion front door** (`ExternalDeviceRawEvent`).
  - Adapter is responsible for:
    - Mapping vendor payloads to **stable, typed raw kinds**.
    - Filling required provenance fields.

- **RawEvent kind naming plan** (examples, not exhaustive):
  - `withings.body_measurement`
  - `withings.sleep_session`
  - `withings.activity_summary`

- **Provenance fields (minimum)**:
  - `vendor`: `"withings"`.
  - `vendor_source`: `"cloud_api"` or narrower identifiers per endpoint group.
  - `vendor_user_id`: Withings user id.
  - `vendor_device_id`: per‑scale / per‑tracker id when available.
  - `vendor_payload_revision`: revision token or last‑modified from Withings.
  - `ingestion_channel`: `"server_oauth"`.

- **Vendor revision handling**:
  - Integrate Withings sync tokens / timestamps into `vendor_payload_revision`.
  - Re‑syncs may **append** new events with explicit lineage; no destructive overwrite.

- **“Expected but missing” handling**:
  - For users who have linked Withings:
    - Track **coverage windows** (e.g. weight readings expected at least once per `N` days).
    - Mark gaps explicitly in the library/timeline metadata (e.g. “no Withings data for the last 7 days”).
  - Absence is modeled as **coverage metadata**, not synthetic zero measurements.

---

### 2. Oura

- **Source**:
  - Oura cloud APIs (sleep, readiness, activity).

- **Auth model**:
  - **Server OAuth** (3‑legged):
    - OAuth flow initiated on device, but tokens stored server‑side only.

- **Ingestion path (single front door)**:
  - Webhook / polling from Oura → **Oura adapter** → **single ingestion front door**.

- **RawEvent kind naming plan**:
  - `oura.sleep_summary`
  - `oura.readiness_summary`
  - `oura.activity_summary`

- **Provenance fields (minimum)**:
  - `vendor`: `"oura"`.
  - `vendor_source`: `"cloud_api"`.
  - `vendor_user_id`: Oura user id.
  - `vendor_device_id`: per‑ring id when exposed.
  - `vendor_payload_revision`: Oura revision / last‑modified.
  - `ingestion_channel`: `"server_oauth"`.

- **Vendor revision handling**:
  - Sleep / readiness data commonly gets **post‑hoc corrections**.
  - A change in `vendor_payload_revision` must yield a **new immutable RawEvent** with:
    - preserved link to prior events for the same night/day,
    - no in‑place mutation of canonical records.

- **“Expected but missing” handling**:
  - For linked Oura accounts:
    - Track daily expectations (sleep + readiness day‑by‑day).
    - Surface missing days as **explicit gaps** in the timeline (e.g. “Oura sleep summary missing for 2026‑02‑09”).

---

### 3. Apple Health

- **Source**:
  - On‑device **Apple HealthKit** exports or sync.

- **Auth model**:
  - **On‑device** permissioning:
    - User grants category‑level access in the **Apple Health** permissions sheet.
    - No long‑lived server‑side OAuth; device is the primary trust boundary.

- **Ingestion path (single front door)**:
  - On‑device collection → normalized export → **Apple Health adapter** → **single ingestion front door**.
  - For Phase 3A, Apple Health may initially be **device‑initiated** (no server push from Apple).

- **RawEvent kind naming plan**:
  - `apple_health.workout`
  - `apple_health.heart_rate_sample`
  - `apple_health.step_sample`
  - `apple_health.body_measurement`

- **Provenance fields (minimum)**:
  - `vendor`: `"apple_health"`.
  - `vendor_source`: `"healthkit_on_device_export"` (or similar).
  - `vendor_user_id`: optional; may be absent or pseudonymous.
  - `vendor_device_id`: HealthKit device identifier if exposed.
  - `vendor_payload_revision`: export file revision / run id / last‑modified.
  - `ingestion_channel`: `"on_device"`.

- **Vendor revision handling**:
  - Each on‑device export/import is a **batch**:
    - Tag every event with an `import_batch_id`.
    - Use `vendor_payload_revision` to mark the specific export run.
  - Re‑exports for overlapping periods should result in **additional immutable RawEvents** with provenance linking back to prior imports.

- **“Expected but missing” handling**:
  - For Apple Health, “expected” is defined by **granted permissions + time since last export**:
    - If user has granted access to steps / heart rate but has not exported in `N` days, we record an **“export overdue”** coverage marker.
  - The system **never assumes** that “no export” == “no data”; we only know that we **have not seen** it yet.

---

### 4. MyFitnessPal (MFP)

- **Source**:
  - **Official MFP API is private / restricted**.
  - Phase 3A must **not** be blocked on MFP API approval.

- **Auth model**:
  - If official API access is granted in the future:
    - Prefer **Server OAuth** with tokens stored server‑side.
  - For Phase 3A, we plan for:
    - **Manual export/import** (user uploads CSV or other export),
    - or **postponed full integration** if manual path is not yet implemented.

- **Ingestion path (single front door)**:
  - Phase 3A **must not depend on direct API access**.
  - We support one of:
    - **Manual export/import path**:
      - User exports from MFP → uploads file → **MFP adapter** → **single ingestion front door**.
    - **Postponed integration**:
      - We define RawEvent kinds and provenance shape now, but do not ship ingestion.

- **RawEvent kind naming plan** (reserved, even if not fully implemented in 3A):
  - `mfp.meal_log`
  - `mfp.exercise_log`
  - `mfp.weight_log`

- **Provenance fields (minimum)**:
  - `vendor`: `"mfp"`.
  - `vendor_source`: `"manual_export"` or `"cloud_api"` (future).
  - `vendor_user_id`: MFP user id when available.
  - `vendor_device_id`: usually absent; MFP is primarily account‑centric.
  - `vendor_payload_revision`: export file revision id / timestamp, or API revision when available.
  - `ingestion_channel`: `"manual_export"` for manual upload; `"server_oauth"` for future official API.

- **Vendor revision handling**:
  - For manual exports:
    - Every uploaded file is a **new revision** (`vendor_payload_revision` = export timestamp / hash).
    - Re‑uploads for overlapping periods **append** new immutable RawEvents with batch provenance.

- **“Expected but missing” handling**:
  - MFP is **user‑driven logging**, not a passive sensor:
    - “Expected” is only defined where the user has historically logged meals / exercise.
  - Absence of logs must not be interpreted as “no intake” or “no exercise”.
  - We may surface gentle coverage metadata (e.g. “no MFP logs for the last week”) but never fabricate calories or macro estimates.

---

## MyFitnessPal Fallback Plan (Binding for Phase 3A)

- **Constraint**:
  - The **official MyFitnessPal API is private / restricted**.
  - We cannot assume API approval or stable access during Phase 3A.

- **Binding requirement for Phase 3A**:
  - **Phase 3A must not be blocked on MFP API approval.**

- **Fallback options**:
  - **Option A: Manual export/import (preferred when implemented)**:
    - Ship a simple **import surface** that accepts standard MFP exports (CSV or similar).
    - Parse into reserved `RawEvent` kinds (`mfp.meal_log`, etc.) via the **single ingestion front door**.
  - **Option B: Postpone integration**:
    - If manual import is not yet implemented in Phase 3A, we:
      - Keep MFP in **“planned but not active”** state.
      - Do **not** block the rest of Phase 3A (Withings, Oura, Apple Health).
      - Preserve this strategy as the binding intent for a future Phase 3X.

Phase 3A is considered **integration‑complete** if Withings, Oura, and Apple Health follow this strategy and MFP is either:

- supported via manual export/import, **or**
- explicitly postponed without blocking other integrations.

---

## Proof Gate & How to Run It

Phase 3A has a dedicated **proof gate** script to enforce this integration strategy at the CI level.

- **Script**: `scripts/ci/proof-gate-phase3a.sh`
- **Behavior**:
  - First, runs the **Phase 2 proof gate** (`scripts/ci/proof-gate-phase2.sh`).
  - Then, runs Phase 3A‑specific Jest tests under `scripts/ci/__tests__/phase3a-*.test.ts`.
  - Phase 3A tests are only considered valid if Phase 2 gates are **already green**.

### Manual execution (developer workflow)

From the repo root:

```bash
npm run typecheck
npm run lint
npm test
bash scripts/ci/proof-gate-phase2.sh
bash scripts/ci/proof-gate-phase3a.sh
```

CI **may** choose to wire `proof-gate-phase3a.sh` as a non‑blocking job in the future. Until then, this document defines the **manual proof‑gate flow** required before declaring Phase 3A integration work complete.

