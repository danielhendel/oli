# Data Sources Repo Audit

## 1. Executive Summary

- **Source/provenance support:** RawEvent has `sourceId`, `provider`, `sourceType`, `receivedAt`, `observedAt`, and optional `provenance` (enum: manual, device, upload, backfill, correction). CanonicalEvent has `sourceId` only (no provider/sourceType). Source is preserved from raw → canonical for manual-only normalization; fact-only (e.g. weight) never becomes canonical. Lab results have optional `sourceRawEventId`. No metric-level “preferred source” exists.
- **Integrations:** **Withings** (real: OAuth, status, pull-now, backfill; writes weight/body-fat raw events with `sourceId: "withings"`, `provider: "manual"`). **Apple Health** (partial: client-side sync for workouts/steps; server reads rawEvents for status; no server-side ingestion of Apple data). **Manual** (real: POST /ingest). **Uploads** (real: kind `"file"`, `sourceId: "upload"`; memory-only, no parsing). **Labs** (real: POST lab results, optional `sourceRawEventId`). **DEXA** (placeholder only: Manage screen label “Bone density / DEXA”, `supportedNow: false`).
- **Preferences storage:** Yes. Stored at `/users/{uid}` document, field `preferences` (GET/PUT /preferences). Schema: `units.mass`, `timezone.mode` / `timezone.explicitIana`, `selectedGymId`. No source or metric-source preferences.
- **Biggest architectural constraint:** Normalization only accepts `provider === "manual"`. Withings weight is written with `provider: "manual"` so it flows through the fact-only path; there is no aggregation of multiple weight sources per day—only the single `factOnlyBody` from the triggering raw event is used, so “last trigger wins” for body facts when multiple weight events exist.
- **Safest direction for Data Sources:** Add metric-to-source preference in preferences (or a dedicated user doc) without changing RawEvent/CanonicalEvent schema. Implement source-aware aggregation (e.g. for body facts) in the pipeline using existing `sourceId`/`provider` and new preference; keep UI (Manage, weight screen, settings) as the place to assign and display source.

---

## 2. Source / Provenance Model

### Exact fields

**RawEvent (lib/contracts/rawEvent.ts, services/functions/src/types/health.ts)**

- **sourceId** (string, required) — Logical source ID (e.g. `"manual"`, `"withings"`, `"upload"`).
- **provider** (string, required) — Provider identifier (e.g. `"manual"`, `"mobile_app"`). Comment in contract: “Keep provider/sourceType flexible for future integrations.”
- **sourceType** (string, required) — High-level classification (e.g. `"manual"`, `"withings"`).
- **receivedAt** (ISO datetime, required) — When Oli received the event.
- **observedAt** (ISO datetime, required) — When the event occurred (provider time, normalized to UTC).
- **provenance** (optional) — Enum: `"manual" | "device" | "upload" | "backfill" | "correction"` (rawEvent.ts).
- **recordedAt** (optional) — When the event was logged (Phase 2).
- **occurredAt** (optional) — Exact or range (Phase 2).
- **correctionOfRawEventId** (optional) — For correction provenance.

**RawEvent list item (retrieval)**  
Exposes: `id`, `userId`, `sourceId`, `kind`, `observedAt`, `receivedAt`, `schemaVersion`, optional `recordedAt`, `provenance`, `uncertaintyState`, `contentUnknown`, `correctionOfRawEventId`. No `provider` or `sourceType` in list DTO.

**CanonicalEvent (retrieval.ts, types/health.ts)**  
Has **sourceId** only. No `provider` or `sourceType`. Base canonical event has: `id`, `userId`, `sourceId`, `kind`, `start`, `end`, `day`, `timezone`, `createdAt`, `updatedAt`, `schemaVersion`.

**Lab result (lib/contracts/labResults.ts)**  
Optional **sourceRawEventId** — links to raw event (e.g. upload).

**Uploads (lib/contracts/uploads.ts)**  
Presence DTO: `rawEventId`, `observedAt`, `receivedAt`, `originalFilename`, `mimeType` — no separate “source” field; source is implied by kind `"file"` and `sourceId: "upload"`.

**DailyFacts / IntelligenceContext (contracts)**  
Optional `meta.source` (record of string → unknown) for pipeline metadata (e.g. `eventsForDay`, `latestCanonicalEventAt`, `factOnlyBody`). Not user-facing source provenance.

### Where they live

- **RawEvent:** `/users/{userId}/rawEvents/{rawEventId}`. Full provenance at ingestion only.
- **CanonicalEvent:** `/users/{userId}/events/{canonicalEventId}`. Only `sourceId` preserved.
- **Preferences:** `/users/{uid}` document, field `preferences`.
- **Integrations (API):** `/users/{uid}/integrations/withings` (and `withings.backfill`). Functions type `UserSourceConnection` at `/users/{userId}/sources/{sourceId}` exists in types/collections but API uses `integrations` subcollection.

### How source is preserved

- **Raw → canonical:** Only for **manual** provider. `mapRawEventToCanonical` (services/functions/src/normalization/mapRawEventToCanonical.ts) returns `UNSUPPORTED_PROVIDER` for `raw.provider !== "manual"`. When mapping, `sourceId` is copied from raw to canonical; `provider`/`sourceType` are not on canonical.
- **Fact-only (e.g. weight):** No canonical event. Trigger passes a single `factOnlyBody` into `recomputeDerivedTruthForDay`; pipeline does not read all weight raw events for the day. So source is stored on RawEvent but not used for “pick one source per metric” in aggregation.
- **Query:** GET /users/me/raw-events supports `provenance` and `sourceId` query params (retrieval.ts), so list can be filtered by source.

---

## 3. Verified Integrations

### Withings

- **Evidence:**  
  - API: `services/api/src/routes/integrations.ts` (OAuth connect/callback, status, revoke), `integrations/withingsPullNow.ts` (pull-now), `withingsPull.ts` (invoker pull 72h), `withingsBackfill.ts` (backfill).  
  - Client: `lib/api/withings.ts`, `lib/data/useWithingsPresence.ts`, `lib/data/withingsPresenceContract.ts`, `lib/integrations/withings/storage.ts`.  
  - Firestore: `users/{uid}/integrations/withings`, system registry `system/integrations/withings_connected/{uid}`.
- **Supported metrics/event kinds:** Weight and body fat. Raw events: `kind: "weight"`, `sourceId: "withings"`, `provider: "manual"` (withingsPull.ts and withingsPullNow.ts).
- **Status:** Real (OAuth, token storage, pull-now, backfill, status). Weight flows via fact-only path; no canonical weight events.

### Apple Health / Apple Watch

- **Evidence:**  
  - Client: `lib/integrations/appleHealth/*` (healthKit, runAnchoredWorkoutsSync, anchor, storage), `lib/api/appleHealth.ts` (GET /integrations/apple-health/status).  
  - API: `services/api/src/routes/integrations/appleHealthStatus.ts` — reads `rawEvents` to derive connected + lastSyncAt.  
  - App: `app/(app)/workouts/overview.tsx`, `history.tsx` (Apple Health chip, connect/sync).
- **Supported metrics/event kinds:** Workouts (and steps in sync flow). Data is written by the app to backend via ingest (manual provider) after reading from HealthKit.
- **Status:** Partial. Client-side HealthKit sync; server does not ingest Apple directly. No `provider: "apple_health"` in normalization (normalization is manual-only).

### Manual entry

- **Evidence:** POST /ingest (services/api/src/routes/events.ts). Body: `sourceId` (default `"manual"`), `provider`, `kind`, `observedAt`, `payload`, optional Phase 2 fields. Writes to `users/{uid}/rawEvents`.
- **Supported metrics/event kinds:** All contract kinds: sleep, steps, workout, weight, hrv, nutrition, strength_workout, file, incomplete.
- **Status:** Real. Primary path for app logging.

### Uploads (file)

- **Evidence:**  
  - API: `services/api/src/routes/uploads.ts` — uploads bytes to storage, writes RawEvent `kind: "file"`, `sourceId: "upload"`, `provider: "manual"`, `sourceType: "manual"`.  
  - GET /users/me/uploads (usersMe or uploads) — lists “file” raw events (uploads list test: filters by `kind: "file"` and sourceId for “upload”).
- **Supported metrics/event kinds:** Memory-only; kind `"file"`. No parsing; not normalized to canonical. mapRawEventToCanonical treats `upload.file` as UNSUPPORTED_KIND (functions use `upload.file` in code; contract uses `file`).
- **Status:** Real. Used for “uploads presence” and labs/imaging entry points.

### Labs upload / lab results

- **Evidence:**  
  - API: POST /users/me/labResults, GET /users/me/labResults (usersMe.ts).  
  - Contract: lib/contracts/labResults.ts — `sourceRawEventId` optional on create and on doc.
- **Supported metrics/event kinds:** Lab results (biomarkers, collectedAt). Optional link to raw event (e.g. upload).
- **Status:** Real. No “source” enum per result; link to raw event only.

### DEXA

- **Evidence:** Manage screen (app/(app)/(tabs)/manage.tsx): metric “Bone density / DEXA” and “DEXA reports” with `supportedNow: false`, `source: null`.
- **Status:** Placeholder only (UI labels, no ingestion or integration).

---

## 4. Metric / Event Kind Mapping

### Raw event kinds (lib/contracts/rawEvent.ts)

- `sleep`, `steps`, `workout`, `weight`, `hrv`, `nutrition`, `strength_workout`, `file`, `incomplete`.

Functions type (health.ts) also references `upload.file` and `file`; normalization checks `raw.kind === "upload.file"`. API uploads use `kind: "file"`.

### Canonical event kinds (lib/contracts/retrieval.ts)

- `sleep`, `steps`, `workout`, `weight`, `hrv`, `nutrition`, `strength_workout`.

Note: Weight is fact-only in normalization (FACT_ONLY_RAW_EVENT_KINDS = ["weight"]), so there are no canonical weight events in practice; body facts come from factOnlyBody or canonical weight if that were ever produced.

### Likely metric mapping (from Manage + pipeline)

- **Weight** → dailyFacts.body.weightKg (from fact-only raw events or canonical weight); raw kind `weight`.
- **Body fat** → dailyFacts.body.bodyFatPercent; same fact-only/weight path.
- **Sleep** → dailyFacts.sleep; raw/canonical `sleep`.
- **Steps** → dailyFacts.activity.steps; raw/canonical `steps`.
- **HRV** → dailyFacts.recovery.hrvRmssd; raw/canonical `hrv`.
- **Workout** → dailyFacts.activity.trainingLoad, canonical `workout`.
- **Strength** → dailyFacts.strength; raw/canonical `strength_workout`.
- **Nutrition** → dailyFacts.nutrition; raw/canonical `nutrition`.
- **Labs** → labResults (separate collection); no event kind.
- **Uploads** → raw kind `file`; presence only; no derived metric yet.
- **Incomplete** → memory-only; no canonical.

### Gaps

- No first-class “metric ID” in contracts; Manage uses a client-side map (e.g. `body.weightKg`, `body.bodyFatPercent`) and `supportedNow` flags. Data Sources design will need a stable metric identifier (e.g. slug or enum) to attach preferred source.
- Raw kind naming: contract `file` vs functions `upload.file` in one branch — worth aligning for clarity.

---

## 5. Preferences / Settings Storage

### Contracts

- **lib/contracts/preferences.ts:** `preferencesSchema`: `units.mass` (lb | kg), `timezone.mode` (recorded | current | explicit), `timezone.explicitIana` (when explicit), `selectedGymId` (string | null). `defaultPreferences()`. No source-related keys.

### API routes

- **GET /preferences** — Reads `userDoc(uid)`, field `preferences`; if missing, writes defaults and returns.  
- **PUT /preferences** — Patch validated by `preferencesPatchSchema` (same keys); merge with existing then set `{ preferences: next.data }` with merge.

### Firestore path / storage model

- Path: **users/{uid}** (document). Field: **preferences** (object). No subcollection for preferences.
- userDoc(uid) in API = `db.collection("users").doc(uid)` (services/api/src/db.ts).

### Can source preferences live there?

- Yes, as an extension. Schema is a single object; adding e.g. `dataSources?: { metricId: string; preferredSourceId: string }[]` or a record keyed by metric ID would fit. Alternative: separate document e.g. `users/{uid}/config/dataSources` if you want to keep preferences view-only and isolate data-source config.

---

## 6. Duplicate / Conflict Handling

### What exists now

- **RawEvent dedupe:** `rawEventDedupe.ts` — dedupe key includes `provider`, `sourceType`, `sourceId`, `kind`, `observedAt`, payload hash. Prevents identical replay; does not choose between different sources for the same metric.
- **Canonical immutability:** `writeCanonicalEventImmutable` — create-only or identical content; no merge of two canonicals.
- **Body facts (weight):** `aggregateDailyFacts.ts` — `buildBodyFacts(events)` uses **canonical** weight events only; “latest by start time” among them. When there are no canonical weight events (current design), body = `factOnlyBody` from the **single** triggering raw event. So with multiple weight raw events (e.g. Withings + manual) for the same day, each trigger overwrites dailyFacts.body with that event’s factOnlyBody — **last trigger wins**, not “latest by time” or “preferred source.”
- **Lab results:** Idempotency by content; optional `sourceRawEventId`. No source-priority logic.
- **Query:** Raw events list can be filtered by `provenance` and `sourceId`; no “prefer source X for metric Y” in backend.

### What does not exist

- No metric-level “preferred source” or “source priority” in preferences or elsewhere.
- No aggregation that merges multiple weight (or other fact-only) sources per day using a rule (e.g. preferred source, or latest by time).
- No conflict resolution model when two sources disagree for the same metric/day.

### Safest place for future source-priority rules

- **Pipeline (recomputeForDay / aggregateDailyFacts):** When building body (or other fact-only) facts, load **all** weight raw events for the day (or all raw events that contribute to that fact), then apply user preference (e.g. preferred sourceId per metric) or deterministic rule (e.g. latest by observedAt within preferred source). Requires reading raw events by kind (+ day) in the pipeline; currently only the single factOnlyBody from the trigger is passed.
- **Alternative:** Keep “single fact per day per metric” but compute it in a scheduled or on-demand job that reads raw events and applies source preference, instead of on every raw event create. That avoids “last trigger wins” and centralizes the rule in one place.

---

## 7. Reusable UI Entry Points

- **Settings:** `app/(app)/settings/index.tsx` — sections from module system; links to Account, Units, Devices, etc. In dev, “Integrations Probe” links to `/debug/integrations`. No dedicated “Data sources” or “Integrations” in production settings yet.
- **Integrations:** `app/(app)/debug/integrations.tsx` — dev-only probe for Withings (status, pull) and Apple Health (sync, anchor). `app/(app)/settings/devices.tsx` — “Devices” screen; redirects to Withings complete URL. Good candidate to extend for “Data sources” or “Connect sources” in production.
- **Weight / body:** `app/(app)/body/weight.tsx` — Withings chip (Connect / connected), modal, “Update” from Withings, manual log CTA (hidden when Withings connected). Source badge by `sourceId` (Withings / Manual). Reusable pattern for “per-metric source” chip.
- **Uploads:** Command Center → “Upload labs” → `app/(app)/labs/upload.tsx` (placeholder: “Upload Labs” shell, no implementation). GET /users/me/uploads used by `useUploadsPresence`; Manage uses uploads presence. Labs overview and upload entry points exist; uploads list/presence can surface “source” as upload.
- **Manual entry:** Log screen, body weight form, nutrition log, workouts/log, recovery, etc. No single “manual entry” hub; each domain has its own log/entry.
- **Source badges/presence:** Weight screen shows “Withings” vs “Manual” from `sourceId`. `useWithingsPresence` exposes connected + lastMeasurementAt. No generic “source badge” component; pattern is per-integration (Withings chip). Reusable: a small “Source: X” or chip per metric using raw-event or preference sourceId.

---

## 8. Architectural Recommendation

Based strictly on repo truth:

- **Where Data Sources should live**
  - **Storage:** Either extend `users/{uid}.preferences` with a structured block (e.g. `dataSources: { [metricId]: preferredSourceId }`) or add a dedicated doc (e.g. `users/{uid}/config/dataSources` or `users/{uid}/preferences` subcollection) so that source preference is explicit and not mixed with display preferences. Contract and API for preferences already support merge/partial update; same pattern can apply.
  - **Backend:** Source-priority logic belongs in the **pipeline** (e.g. in or beside `aggregateDailyFacts` / fact-only body computation), not in ingestion. Ingestion should continue to tag every raw event with `sourceId`/`provider`/`sourceType`; pipeline should consume preferences and raw events to produce a single derived fact per metric per day when multiple sources exist.
  - **API:** Read/write for “data source preferences” can be a new route (e.g. GET/PUT /users/me/data-source-preferences) or part of an extended preferences contract; avoid overloading existing integration routes (they are integration-specific, not metric-specific).

- **Object model**
  - Prefer **metric-level** preference: one preferred source (or ordered list) per metric ID. Metric ID should match a stable set (e.g. weight, body_fat_percent, sleep, steps, hrv, etc.) that maps to dailyFacts paths and raw kinds. Category-level is possible but coarser; source-level only (“use Withings for everything it provides”) is simpler but less flexible than per-metric.

- **What to defer**
  - Changing RawEvent/CanonicalEvent schema for provenance (already sufficient for source identity).
  - Full “merge/combine” of multiple sources (e.g. average) until single-source preference is in place and proven.
  - Production UI for “Data sources” until preferences/pipeline support exists and one metric (e.g. weight) is wired end-to-end.

---

## 9. Important Files

- **Contracts:** `lib/contracts/rawEvent.ts`, `lib/contracts/retrieval.ts`, `lib/contracts/preferences.ts`, `lib/contracts/uploads.ts`, `lib/contracts/labResults.ts`, `lib/contracts/provenance.ts`, `lib/contracts/dailyFacts.ts`.
- **Normalization / pipeline:** `services/functions/src/normalization/mapRawEventToCanonical.ts`, `services/functions/src/normalization/onRawEventCreated.ts`, `services/functions/src/dailyFacts/aggregateDailyFacts.ts`, `services/functions/src/pipeline/recomputeForDay.ts`.
- **Ingestion:** `services/api/src/routes/events.ts` (POST /ingest), `services/api/src/routes/uploads.ts`, `services/api/src/routes/withingsPull.ts`, `services/api/src/routes/integrations/withingsPullNow.ts`.
- **Integrations API:** `services/api/src/routes/integrations.ts`, `services/api/src/routes/integrations/appleHealthStatus.ts`, `services/api/src/db.ts`.
- **Preferences:** `services/api/src/routes/preferences.ts`, `lib/api/preferences.ts`.
- **Dedupe / types:** `services/functions/src/ingestion/rawEventDedupe.ts`, `services/functions/src/types/health.ts`, `services/functions/src/db/collections.ts`.
- **UI:** `app/(app)/(tabs)/manage.tsx`, `app/(app)/body/weight.tsx`, `app/(app)/settings/index.tsx`, `app/(app)/settings/devices.tsx`, `app/(app)/debug/integrations.tsx`, `lib/data/useWithingsPresence.ts`, `lib/data/withingsPresenceContract.ts`.
