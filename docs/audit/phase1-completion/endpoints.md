# Phase 1 — Required API Endpoints

**Authority:** `scripts/ci/assert-api-routes.mjs`  
**Scope:** All endpoints enforced by CI (must exist in compiled API).

---

## Sprint 1 Retrieval Surfaces (GET /users/me/*)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/me/raw-events` | GET | List raw events with start/end, kinds, cursor, limit |
| `/users/me/events` | GET | List canonical events with start/end, kinds, cursor, limit |
| `/users/me/timeline` | GET | Day aggregates with presence flags (hasDailyFacts, hasInsights, etc.) |
| `/users/me/lineage` | GET | Maps raw → canonical → derived ledger (by canonicalEventId or day+kind+observedAt) |
| `/users/me/derived-ledger/snapshot` | GET | Replay snapshot for a day (as-of truth) |
| `/users/me/derived-ledger/runs` | GET | List derived ledger runs for a day |

---

## Other Phase 1 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ingest` | POST | Ingest raw event (single front door; requires Idempotency-Key) |
| `/users/me/daily-facts` | GET | Daily facts for a day |
| `/users/me/insights` | GET | Insights for a day |
| `/users/me/intelligence-context` | GET | Intelligence context for a day |
| `/users/me/day-truth` | GET | Day truth (readiness + aggregates) |
| `/users/me/failures` | GET | Failure list |
| `/users/me/uploads` | GET | Upload presence list |
| `/export` | POST | Data export |
| `/account/delete` | POST | Account deletion |

---

## Enforcement

- `node scripts/ci/assert-api-routes.mjs` fails if any required route is missing.
- Requires `services/api/dist` (run `npm run -w api build` first).
