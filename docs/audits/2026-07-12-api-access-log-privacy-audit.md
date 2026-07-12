# API Access-Log Privacy Repair Audit

**Date:** 2026-07-12
**Privacy branch:** `fix/pr183-api-access-log-privacy`
**Privacy worktree:** `/Users/danielhendel/oli-api-access-log-privacy`
**Feature base SHA:** `8788c526e42b04eee7e7a1fc050a1e0f53923c49`
**Feature base tree:** `00b6f99f8efb90c475d529d8dd44a37ff4b94b10`
**Safety ref:** `safety/weekly-fitness-before-access-log-privacy-8788c52` (local only)

This audit is privacy-safe. It contains no UIDs, emails, IPs, tokens, keys,
exact health dates, query values, raw URLs, response bodies, or raw logs.

---

## 1. Original preflight finding

Corrected Weekly Fitness backend preflight (`8788c52` / revision
`oli-api-00232-yow`) found that generic API `accessLogMiddleware` emitted:

| Prohibited field (name only) | Source |
|---|---|
| `uid` | `req.uid` after auth |
| `path` (with query) | `sanitizePathForLogs(req.originalUrl)` — redacted only secret key names; left `start`/`end` and other health-range query values |
| `rid` | raw request middleware id (not UUID-gated for telemetry) |
| `method` / `status` / `ms` | operational (allowed shape, wrong event contract) |

Event name was `msg: "request"`.

### Inventory (pre-repair)

| File | Function | Event | Current fields | Source | Safe? |
|---|---|---|---|---|---|
| `services/api/src/lib/logger.ts` | `accessLogMiddleware` | `request` | `msg`, `rid`, `method`, `path`, `status`, `ms`, `uid` | req + res | **No** |
| `services/api/src/lib/logger.ts` | `requestIdMiddleware` | (none) | sets `rid` + `x-request-id` | header / `randomUUID()` | Yes (HTTP correlation) |
| `services/api/src/lib/logger.ts` | `sanitizePathForLogs` | (helper) | path + query with partial redaction | `originalUrl` | **No** |

---

## 2. Final access-log allowlist

Event: `operation` / `msg` = `http_request_completed`

Allowed fields:

- `operation`
- `method` (normalized: GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD/OTHER)
- `routeTemplate` (server-owned template only)
- `statusCode`
- `durationMs`
- `requestId` (strict RFC UUID; invalid inputs replaced with `randomUUID()` for telemetry only)
- `authenticated` (boolean)
- `matchedRoute` (boolean)
- `safeErrorCode` (optional closed union)

Prohibited (never emitted): uid, userId, email, IP, headers, tokens, keys,
raw path/URL/originalUrl, query names/values, start/end/day/date, bodies,
raw errors/stacks, concrete path parameters.

---

## 3. Route-template derivation

Preferred source after Express routing: `req.baseUrl + req.route.path`.

| Case | Result |
|---|---|
| Nested matched route | e.g. `/users/me/oura-stress` |
| Declared dynamic template | e.g. `/ingest/:rawEventId` (no concrete ID) |
| Unmatched 404 | `UNMATCHED_ROUTE` |
| RegExp / array / unsafe metadata | `MATCHED_ROUTE` |
| Candidate with `?`, `#`, `@`, dates, tokens, encoded values, concrete `/users/<id>/` | `MATCHED_ROUTE` |

Never falls back to `req.originalUrl` / `req.url` / query.

---

## 4. Request-ID sanitation

`sanitizeApiAccessTelemetryRequestId`:

- Accepts only strict UUID (36 chars)
- Otherwise replaces with `randomUUID()` for **telemetry only**
- Does not change HTTP `x-request-id` response header behavior

---

## 5. Auth-state and emission behavior

- `authenticated`: `true` iff `req.uid` is a non-empty string; UID value never logged
- One emission per request: `finish` and `close` share an `emitted` guard

---

## 6. Implementation files

| Area | Path |
|---|---|
| Typed telemetry | `services/api/src/lib/apiAccessTelemetry.ts` |
| Middleware | `services/api/src/middleware/accessLogMiddleware.ts` |
| Logger (request-id only; access middleware removed) | `services/api/src/lib/logger.ts` |
| App wiring | `services/api/src/index.ts` |
| Privacy assertion | `services/api/src/lib/testSupport/assertApiAccessTelemetryPrivacy.ts` |
| Tests | `services/api/src/lib/__tests__/apiAccessTelemetry.test.ts` |
| Source guard | `services/api/src/lib/__tests__/apiAccessTelemetrySourceGuard.test.ts` |
| Docs | `docs/audits/2026-07-12-api-access-log-privacy-audit.md` |

---

## 7. Test matrix

- Request-ID accept/replace (UUID vs sentinels)
- Method normalization
- Nested / root / dynamic / unmatched / RegExp / array route templates
- Logger-capture allowlist + sentinel absence
- Middleware 2xx/4xx/5xx + safeErrorCode
- finish/close single emission
- OPTIONS
- `x-request-id` response header parity
- Forbidden-key / forbidden-value assertion
- Direct-logger source guard on access middleware

---

## 8. Functional parity

Unchanged by design:

- Route registration, auth, UID scoping for **data** access
- Query parsing, DTOs, HTTP statuses, CORS, OpenAPI
- Idempotency, Oura provider/ingestion, post-raw Function, Firestore paths
- Weekly Fitness product behavior, mobile behavior

Only change: generic API access logs no longer emit UID, raw URL, query values,
concrete path parameters, headers, or other sensitive request metadata.

---

## 9. OpenAPI / Gateway

- OpenAPI SHA-256 (unchanged): `35201567f39138c686cd33a7f89296ee12f172b5c03e28f9e1b3c14804281048`
- Gateway config `oli-api-config-weekly-fitness-8788c52-20260712-201806` remains contract-compatible
- Do not attach or delete

---

## 10. Function artifact eligibility

- No Function source diff vs `8788c52`
- No `lib/contracts` diff
- Firebase Functions source ownership remains `services/functions`
- Conclusion recorded in the Cursor response after package comparison

---

## 11. API artifact invalidation

| Artifact | Status |
|---|---|
| `oli-api-00232-yow` | **Superseded** — built before access-log privacy repair |
| Digest `sha256:22b95775…` | Must not be cut over |
| New immutable API image + zero-traffic revision | Required after merge/push of this repair |

Preserve existing revisions/images.

---

## 12. Cloud Run platform request-log assessment

Application access logging ≠ Cloud Run platform `run.googleapis.com/requests`.

Platform request URL query behavior is assessed read-only in the Cursor response as:

```text
platformRequestUrlContainsQueryValues: true | false | not verified
```

When platform logs retain query values, treat as separate infrastructure privacy
risk (log-router exclusion, retention/access policy, route redesign, etc.).
Do not leave the application logger unsafe.

---

## 13. Remaining debt (out of scope)

- Mobile Workout / Energy / Apple Health telemetry
- Weekly Fitness render-frequency Sleep logging
- Year-scale Activity / Workout hydration
- Nutrition edge under-count; no Weekly Progress detail route
- `sleep-day-refresh` HTTP 500
- Physical-device verification; PR stack unmerged
- Platform request-log query handling (if applicable)
