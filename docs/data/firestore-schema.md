# Firestore Schema (Sprint 2)

This document defines the canonical Firestore layout for OLI, the security intent enforced in `firestore.rules`, and what data is client-writable vs. server-only.

## Top-level

- `events/{eventId}` — **append-only**, per-user events
- `users/{uid}` — per-user namespace (private)
  - `profile/{docId}` — profile docs (client R/W)
  - `devices/{docId}` — device metadata (client R/W)
  - `permissions/{docId}` — feature flags/consents (client R/W)
  - `uploads/{uploadId}` — user uploads metadata (client R/W)
  - `logs/{logType}/{logId}` — granular raw logs (client R/W)  
    `logType ∈ {workouts, cardio, nutrition, recovery, other}`
  - `facts/{aggType}/{aggId}` — derived facts (client **read-only**)  
    Examples: `facts/daily/2025-10-14`, `facts/weekly/2025-W42`
  - `analytics/{docId}` — aggregated analytics (client **read-only**)
  - `insights/{docId}` — model/coach insights (client **read-only**)
  - `audit/{docId}` — system audit (client **read-only**)

## Security intent

- `users/{uid}` subtree is accessible **only** to the authenticated owner: `request.auth.uid == uid`.
- `facts`, `analytics`, `insights`, `audit` are **server-writable only** (Cloud Functions/Run). Clients **cannot write** them.
- `events` are **append-only**: `allow create` for any authenticated user; `update/delete` **denied**.  
  `read` allowed only if `resource.data.uid == request.auth.uid`.
- No public reads anywhere; **all** access requires auth.

## Data contracts (selected)

### `events/{eventId}`
```ts
type EventEnvelope = {
  uid: string;           // owner
  kind: string;          // e.g. 'workout.logged'
  payload: unknown;      // zod-validated per kind
  ts: Timestamp;         // serverTimestamp()
};
