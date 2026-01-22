# Phase 1 Ingestion Policy (Authoritative)

This document defines what is allowed into “memory” (RawEvents) and how it becomes canonical + derived truth.

This is an integrity document, not product documentation.

## Scope

Phase 1 covers:

- RawEvent ingestion (manual API ingestion + uploads + backfill)
- Immutable RawEvent storage
- Deterministic normalization into canonical events
- Deterministic recompute into derived read models (dailyFacts, intelligenceContext, insights)
- Replay safety + idempotency guarantees

## Source of Truth

Validation is enforced in code (fail-closed):

- `@oli/contracts` (RawEvent schema + payload validation per kind)
- API ingestion route validates input and validates RawEvent doc before write
- Upload route creates RawEvent first-class objects (not special-cased)
- Backfill tool emits RawEvents through the same ingestion boundary (POST /ingest)

If an ingestion path does not satisfy the contract, it cannot write a RawEvent.

## Who Can Ingest

### 1) Authenticated user ingestion (manual)
- Via API: `POST /ingest`
- Requires a valid Firebase ID token.
- Requires `Idempotency-Key` header.

### 2) Authenticated upload ingestion (manual provider)
- Via API upload route (creates a RawEvent with storage-backed payload).
- Uses deterministic idempotency so replays do not re-upload bytes.

### 3) Historical backfill ingestion
- Executed as a client script that calls the same ingestion boundary (`POST /ingest`)
- Uses deterministic idempotency keys per input line.

### 4) Admin-only recompute
- Admin recompute endpoints exist in Firebase Functions for:
  - DailyFacts
  - Insights
  - IntelligenceContext
- These endpoints do not mutate canonical truth. They only recompute derived outputs.
- Authorization requires Firebase custom claim: `admin: true`.

## Ingestion Formats

RawEvents are written to Firestore:

- Path: `users/{uid}/rawEvents/{rawEventId}`

A RawEvent must satisfy:

- `schemaVersion == 1`
- `id`, `userId`, `provider`, `sourceType`, `sourceId`, `kind`, `receivedAt`, `observedAt`, `payload`
- `payload` must match the payload contract for the specific `kind`

### Time semantics
- `observedAt`: when the measurement/event occurred (can be historical)
- `receivedAt`: when the system accepted the event (server time)
- Ingestion prefers `observedAt`; `occurredAt` is allowed as an alias if supported by input schema.

### Idempotency semantics
- For `/ingest`, the doc id is the Idempotency-Key.
- Replaying the same Idempotency-Key is treated as an idempotent replay and does not duplicate.

## Uploads

Uploads are not special cases. Each upload produces a RawEvent of kind `file`:

- RawEvent payload includes:
  - `storageBucket`
  - `storagePath`
  - `sha256`
  - `sizeBytes`
  - `mimeType`
  - `originalFilename`

### Storage integrity
- The stored bytes must hash to the same sha256 recorded in the RawEvent payload.
- Replays do not re-upload bytes (prevents orphan objects).

## Historical Backfill

Backfill emits RawEvents with historical `observedAt` while keeping `receivedAt` as “now”.

Rules:
- Backfill MUST use deterministic idempotency keys (e.g. derived from line content).
- Backfill MUST be re-runnable.
- Backfill MUST NOT mutate existing canonical events; it may only add RawEvents.
- Running the same backfill twice must yield identical canonical + derived state (replay-stable).

## What is Rejected (Fail-Closed)

The system rejects ingestion if any of these are true:

- Missing or invalid Firebase ID token (401)
- Missing Idempotency-Key for ingestion (400)
- Body does not satisfy ingestion input schema (400)
- Constructed RawEvent does not satisfy RawEvent contract (400)
- Payload does not satisfy kind-specific payload schema (400)
- Firestore write fails and existing doc cannot be verified (500)

Non-JSON responses from reads are treated as failures in proof tooling (fail-closed).

## Immutability + Replay Guarantees

### RawEvents
- RawEvents are immutable once written.
- Idempotency ensures replays do not create duplicates.

### Canonical events
- Canonical outputs are produced by normalization from RawEvents.
- Canonical events remain immutable; new truth is represented as new events, not mutation.

### Derived read models
Derived state is recomputable deterministically from canonical truth:
- `users/{uid}/dailyFacts/{YYYY-MM-DD}`
- `users/{uid}/intelligenceContext/{YYYY-MM-DD}`
- `users/{uid}/insights/{insightId}` (one doc per insight; query by `.date == YYYY-MM-DD`)
- IntelligenceContext stores an insights *summary object* (e.g. `insights: { ids, count, bySeverity, kinds, tags }`), not a separate per-day insights collection.

Replay safety means: recompute produces the same semantic result for the same underlying canonical truth.

## Operational Proof Artifacts

Phase 1 includes proof scripts + receipts:

- Upload -> RawEvent -> Storage sha verification receipts
- Backfill script that is deterministic + replay-safe
- Normalized snapshot hashing to prove derived stability (ignoring volatile computedAt timestamps)

