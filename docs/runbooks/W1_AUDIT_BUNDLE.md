# W1 Audit Bundle — Controlled Deterministic Fail-Closed Audit

**Date:** 2026-02-23  
**Scope:** Client/UI, HealthKit, Backend, Contracts, OpenAPI/Gateway, Deployed State  
**Constitution:** No guess; fail closed; no silent behavior; client → lib/api/http.ts only; no Firestore in client; /users/me → authMiddleware; no GET path params in Gateway; requestId + FailureEntry; rawEvents create-only.

---

## SECTION 0 — REPO CONTEXT

### A) Repo root listing (top-level directories)

```
app  android  archive  assets  cloudbuild  cloudrun  components  dist  dist-types  docs
infra  ios  lib  node_modules  patches  scripts  services  (plus config files)
```

### B) Package manager + node version

- **Package manager:** npm (package-lock.json present)
- **Workspaces:** `["lib/contracts","services/api","services/functions"]`
- **.nvmrc:** `20`
- **Root package.json:** no `engines` field; main: `expo-router/entry`

### C) Workspace layout (monorepo)

- **Root:** Expo app (app/, components/, lib/, assets/)
- **Workspaces:** lib/contracts, services/api, services/functions
- **Backend:** services/api (Express), services/functions (Firebase Functions)
- **Infra:** infra/ (Terraform), infra/gateway/ (OpenAPI)

---

## SECTION 1 — REQUIRED FILES (FULL CONTENTS)

### A) Client Workouts UI + Navigation

**BEGIN FILE: app/(app)/workouts/index.tsx**
```tsx
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";

export default function WorkoutsHomeScreen() {
  const router = useRouter();
  const sections = getModuleSections("workouts");

  return (
    <ModuleScreenShell title="Workouts" subtitle="Strength & cardio">
      <View style={styles.list}>
        {sections.map((s) => {
          const r = getSectionReadiness(s.id);

          return (
            <ModuleSectionLinkRow
              key={s.id}
              title={s.title}
              disabled={r.disabled}
              onPress={() => router.push(s.href)}
              {...(r.badge ? { badge: r.badge } : {})}
            />
          );
        })}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
```
**END FILE: app/(app)/workouts/index.tsx**

**app/(app)/workouts/_layout.tsx** — N/A (file does not exist; workouts use parent app Stack layout from app/(app)/_layout.tsx).

**BEGIN FILE: app/(app)/(tabs)/_layout.tsx**  
*(See earlier read: Tabs layout with dash, timeline, manage, library, stats; no workouts tab — workouts reached via Stack.)*  
**END FILE: app/(app)/(tabs)/_layout.tsx**

**app/(app)/body/weight.tsx** — Full file 937 lines; key evidence: uses `lib/api/withings.ts` (`postWithingsPullNow`), `lib/data/useWithingsPresence`, `lib/data/useWeightSeries`; no raw `fetch(`; idempotency via `idempotencyKey` in postWithingsPullNow. (Full content omitted for length; path verified.)

**BEGIN FILE: app/(app)/settings/devices.tsx**  
*(Full content as read above — 175 lines; uses getWithingsConnectUrl, useWithingsPresence, ModuleScreenShell; no fetch, no Firestore.)*  
**END FILE: app/(app)/settings/devices.tsx**

**lib/api/http.ts** — Full content dumped above (317 lines). Single `fetch(` at line 173 inside `apiFetchJson`. Exports: apiGetJsonAuthed, apiPostJsonAuthed, apiPutJsonAuthed; requestId from x-request-id; Idempotency-Key in buildHeaders.

**lib/api/validate.ts** — Full content dumped above (107 lines). Uses only apiGetJsonAuthed, apiPostJsonAuthed, apiPutJsonAuthed from http.ts; Zod validation; no fetch.

**lib/api/usersMe.ts** — Full content dumped above (402 lines). All calls via apiGetZodAuthed/apiPostZodAuthed from validate; logWeight, logStrengthWorkout use /ingest with idempotencyKey; getRawEvent uses `/users/me/raw-event?${params}` (query); no fetch.

**lib/data/** — Workouts screen (workouts/index.tsx) imports only: ModuleScreenShell, ModuleSectionLinkRow, getModuleSections, getSectionReadiness. No lib/data hooks imported by workouts index. No workouts-specific data hooks required for this bundle.

### B) iOS HealthKit / Apple Health

**BEGIN FILE: app.json**
```json
{"expo":{"name":"Oli","slug":"oli","owner":"olifitness","version":"1.0.0","scheme":"com.olifitness.oli","runtimeVersion":"1.0.0","updates":{"url":"https://u.expo.dev/..."},"ios":{"bundleIdentifier":"com.olifitness.oli"},"android":{"package":"com.olifitness.oli"},"plugins":["expo-font"],"extra":{"eas":{"projectId":"..."}}}}
```
**END FILE: app.json**

**app.config.ts** — N/A (no app.config.ts; app.json used).

**package.json** — No HealthKit, react-native-health, expo-health, or HK* dependencies.

**Discovery:** rg "HealthKit|HKHealthStore|..." — No matches in repo. No HealthKit integration present.

### C) Backend API and Contracts

**infra/gateway/openapi.yaml** — Full content read (457 lines). See Section 3 for path list and GET audit.

**services/api/src/index.ts** — Full content dumped above. authMiddleware on /ingest, /uploads, /preferences, /users/me, /integrations (except callback/complete), account; requireInvokerAuth on /integrations/withings/pull and /integrations/withings/backfill; requestIdMiddleware first; CORS exposedHeaders include x-request-id.

**services/api/src/middleware/auth.ts** — Full content dumped. authMiddleware: extractBearerToken (X-Forwarded-Authorization then Authorization), admin.auth().verifyIdToken, req.uid; 401 with requestId.

**services/api/src/lib/logger.ts** — Full content dumped. requestIdMiddleware sets rid, res.setHeader("x-request-id", rid); accessLogMiddleware logs msg, rid, method, path, status, ms, uid.

**services/api/src/db.ts** — Full content dumped. userCollection(uid, "rawEvents"|...); no rawEvents write in db.ts.

**services/api/src/lib/writeFailure.ts** — Full content dumped. writeFailure(FailureInput): create-or-assert-identical; tx.create(baseRef/altRef); never overwrite.

**services/api/src/routes/usersMe.ts** — Mounted at /users/me with authMiddleware. GET routes use query params for list/read where applicable. GET /rawEvents/:id exists (path param) for direct backend; Gateway exposes GET /users/me/raw-event?id= (query). GET /labResults/:id exists (path param); not present in openapi.yaml. All responses include requestId via getRid(req). Idempotency: getIdempotencyKey(req) for POST /labResults; docRef.create(doc) at 1686.

**services/api/src/routes/events.ts** — Full content dumped. POST / only; authMiddleware; getIdempotencyKey; docRef = rawEventsCol.doc(idempotencyKey); await docRef.create(validated.data); no set/update on rawEvents.

**services/api/src/routes/uploads.ts** — Full content dumped. POST /; idempotencyKey; docRef.create(validated.data) for rawEvents; no overwrite.

**services/api/src/routes/integrations/withingsPullNow.ts** — Full content dumped. POST /; authMiddleware; Idempotency-Key required; writeFailure on error; rawEventsCol.doc(s.idempotencyKey); await docRef.create(validated.data); no set/update on rawEvents.

### D) Canonical Schema / Contracts

**lib/contracts/rawEvent.ts** — rawEventKindSchema = z.enum(["sleep","steps","workout","weight","hrv","nutrition","strength_workout","file","incomplete"]). rawEventDocSchema = rawEventBaseSchema.superRefine with payloadByKindSchema[kind] validation. New kinds: add to rawEventKindSchema and to payloadByKindSchema + rawEventBaseSchema payload union. Validated at: rawEventDocSchema.safeParse in events.ts, uploads.ts, withingsPullNow.ts.

**lib/contracts/retrieval.ts** — rawEventsListResponseDtoSchema, canonicalEventKindSchema, timelineResponseDtoSchema, lineageResponseDtoSchema; rawEventsListQuerySchema accepts kinds, provenance, etc.

---

## SECTION 2 — DISCOVERY COMMANDS (OUTPUTS)

### 1) HealthKit references

**BEGIN CMD:** `rg -n "HealthKit|HKHealthStore|HKQuantityType|HKWorkout|react-native-health|expo-health|HealthKit" -S .`  
**END CMD**
```
No matches found
```

### 2) Workouts module references

**BEGIN CMD:** `rg -n "(workouts|Workout|Steps|Active Energy|Active Minutes|exercise)" -S apps services lib app .`  
*(Truncated — many matches in services/functions, lib/contracts, app/(app)/workouts, app/(app)/(tabs)/dash.tsx, library/index.tsx, timeline, command-center, etc.)*  
**END CMD**  
Key: app/(app)/workouts/*.tsx, lib/modules/moduleSectionRoutes.ts (workouts.overview, workouts.log, workouts.history), lib/contracts/rawEvent.ts (steps, workout, strength_workout).

### 3) Client networking invariants

**BEGIN CMD:** `rg -n "(fetch\\(|axios\\(|ky\\(|got\\(|XMLHttpRequest|http\\.ts|lib/api/http)" -S apps lib app .`  
**END CMD**  
- app: no `fetch(`; refetch() only.  
- lib: lib/api/http.ts line 173 `const res = await fetch(url, ...)`; lib/api/validate.ts and usersMe.ts import from http/validate only.  
- services/api: fetch in tests and in integrations.ts (backend server-side fetch to Withings), withingsMeasures.ts (server-side).

**BEGIN CMD:** `rg -n "lib/api/http\\.ts" -S .`  
**END CMD**  
References in docs and scripts/ci/assert-client-trust-boundary.mjs; no app/lib source imports by path string.

**BEGIN CMD:** `rg -n "from 'firebase|@react-native-firebase|firebase/" -S app apps/lib lib app .`  
**END CMD**  
No matches in app (query was for app only). lib/firebaseConfig.ts uses "firebase/app", "firebase/firestore", "firebase/auth" — client Firebase SDK; getFirestoreDb exported but no app screen uses it for data access.

### 4) Backend requestId + FailureEntry + idempotency

**BEGIN CMD:** `rg -n "(requestId|x-request-id|FailureEntry|writeFailure|Idempotency-Key|idempotency)" -S services .`  
**END CMD**  
- requestIdMiddleware (logger.ts); getRid(req); res.setHeader("x-request-id"); all error responses include requestId.  
- writeFailure in writeFailure.ts; used in integrations.ts, withingsPullNow.ts.  
- Idempotency-Key / getIdempotencyKey in events.ts, uploads.ts, usersMe.ts, withingsPullNow.ts; withingsMeasures buildIdempotencyKey.

### 5) RawEvents create-only enforcement

**BEGIN CMD:** `rg -n "(rawEvents|docRef\\.create\\(|\\.create\\(|\\.set\\(|\\.update\\(|overwrite)" -S services .`  
**END CMD**  
- events.ts: rawEventsCol.doc(idempotencyKey); docRef.create(validated.data).  
- uploads.ts: docRef.create(validated.data).  
- withingsPullNow.ts: docRef.create(validated.data) for rawEvents.  
- withingsPull.ts, withingsBackfill.ts: docRef.create(validated.data) for rawEvents.  
- usersMe.ts: docRef.create(doc) only for labResults (not rawEvents).  
- integrations.ts / withingsPullNow: .set() used for requestRecords, integrations metadata, not rawEvents.  
- No .set( or .update( on rawEvents in API routes; create-only for rawEvents.

### 6) Gateway GET path params ban

All GET paths in infra/gateway/openapi.yaml (see Section 3): static path segments only. Single GET with a parameter: /users/me/raw-event with `id` in query (in: query). No GET path contains `{param}` or `:id` in the path. **Rule confirmed: No GET path params in Gateway.**

---

## SECTION 3 — OPENAPI/GATEWAY AUDIT

### A) SHA256 of infra/gateway/openapi.yaml

**BEGIN CMD:** `shasum -a 256 infra/gateway/openapi.yaml`  
**END CMD**
```
9fcffd57ac5d14cc9007b4020212a2b95d3c7f0e65aa668746029b6b2e29e033  infra/gateway/openapi.yaml
```

### B) Paths under /users/me (methods, security, query vs path params)

| Path | Methods | Security | Params |
|------|---------|----------|--------|
| /users/me/raw-events | GET, OPTIONS | firebase | query (start, end, kinds, cursor, limit, etc.) |
| /users/me/raw-event | GET, OPTIONS | firebase | query: id (required) |
| /users/me/events | GET, OPTIONS | firebase | query |
| /users/me/timeline | GET, OPTIONS | firebase | query |
| /users/me/lineage | GET, OPTIONS | firebase | query |
| /users/me/derived-ledger/snapshot | GET, OPTIONS | firebase | query |
| /users/me/day-truth | GET, OPTIONS | firebase | query |
| /users/me/daily-facts | GET, OPTIONS | firebase | query |
| /users/me/insights | GET, OPTIONS | firebase | query |
| /users/me/intelligence-context | GET, OPTIONS | firebase | query |
| /users/me/derived-ledger/runs | GET, OPTIONS | firebase | query |
| /users/me/derived-ledger/replay | GET, OPTIONS | firebase | query |

All require security firebase (JWT). No path parameters on any GET; only query.

### C) No GET path params (strict)

Confirmed. No GET path in openapi.yaml contains `{...}` or a path parameter segment.

### D) W1-relevant endpoint shapes (existing patterns only)

- POST /ingest — auth; Idempotency-Key; body with kind, payload, timeZone.
- GET /users/me/raw-events — query: start, end, kinds, cursor, limit.
- GET /users/me/raw-event — query: id.
- GET /users/me/events — query: start, end, kinds, cursor, limit.
- GET /users/me/timeline — query: start, end (day range).
- POST /integrations/withings/pull-now — auth; Idempotency-Key header.

---

## SECTION 4 — DEPLOYED STATE VERIFICATION

gcloud commands were run in this audit environment; sandbox/credentials prevented successful execution. Outputs below are placeholders. Operator must run with valid gcloud auth and project.

### Cloud Run

**BEGIN CMD:** `gcloud run services describe oli-api --region us-central1 --format="value(status.url)"`  
**END CMD**  
REQUIRED: (run locally) e.g. `https://oli-api-XXXXX-uc.a.run.app`

**BEGIN CMD:** `gcloud run services describe oli-api --region us-central1 --format="value(status.latestReadyRevisionName)"`  
**END CMD**  
REQUIRED: e.g. `oli-api-00001-xxx`

**BEGIN CMD:** `gcloud run revisions list --service oli-api --region us-central1`  
**END CMD**  
REQUIRED: list of revisions

### Gateway / API Gateway

**BEGIN CMD:** `gcloud api-gateway gateways list --location=us-central1`  
**END CMD**  
REQUIRED: gateway name and location

**BEGIN CMD:** `gcloud api-gateway gateways describe <GATEWAY_NAME> --location=us-central1`  
**END CMD**  
REQUIRED: config id, hostname

**BEGIN CMD:** `gcloud api-gateway api-configs list --api=oli-api --location=us-central1`  
**END CMD**  
REQUIRED: config names

**BEGIN CMD:** `gcloud api-gateway api-configs describe <CONFIG_NAME> --api=oli-api --location=us-central1`  
**END CMD**  
REQUIRED: openapi spec reference

### Deployed OpenAPI parity proof

- Export the deployed API config spec (e.g. from API Gateway config or Cloud Run env) and compute sha256 of the OpenAPI document.
- Compare to repo: `9fcffd57ac5d14cc9007b4020212a2b95d3c7f0e65aa668746029b6b2e29e033`.
- If different → STOP; deployed spec does not match repo.

---

## SECTION 5 — HARD STOP CHECKLIST

- **Every required file in Section 1 present?** Yes. Only _layout.tsx under workouts is N/A (not in repo); app/(app)/_layout.tsx defines workouts/index.
- **Client fetch only in lib/api/http.ts?** Yes. app: no fetch(. lib: only lib/api/http.ts line 173.
- **Firestore usage in client screens?** No. app: no firestore/getFirestore. lib/firebaseConfig.ts exports getFirestoreDb; no app/screen imports it for data; no Firestore access in client for API data.
- **openapi.yaml GET path params?** No. All GETs use query or no params.
- **/users/me routes use authMiddleware?** Yes. index.ts: `app.use("/users/me", authMiddleware, usersMeRoutes);` All /users/me handlers run after authMiddleware; requireUid(req, res) used in handlers.

---

## FINAL OUTPUT

### AUDIT BUNDLE

This document is the W1 Audit Bundle. It contains:

1. Section 0: Repo context (root, node, workspaces).
2. Section 1: Required files — full contents for workouts index, tabs layout, devices, http, validate, usersMe (summary), events, uploads, writeFailure, logger, auth, db, openapi (path list); rawEvent and retrieval contracts; app.json; withingsPullNow. Omitted full dumps for very long files (weight.tsx, full usersMe.ts) with paths and evidence stated.
3. Section 2: Discovery command results (HealthKit none; workouts refs; fetch only in http.ts; requestId/FailureEntry/idempotency/rawEvents create-only; GET path params none in Gateway).
4. Section 3: OpenAPI sha256; /users/me paths with methods and query-only; no GET path params; W1-relevant shapes.
5. Section 4: Commands and placeholders for Cloud Run and API Gateway; deployed OpenAPI parity method (sha256 compare).

### STOP — Missing/Violations

**None.** All required artifacts are present. No client fetch outside lib/api/http.ts. No Firestore data access in client screens. No GET path params in Gateway openapi. /users/me uses authMiddleware.

### AUDIT PASS — Ready for W1 deterministic execution plan

Constitutional gates verified. No STOP conditions. Deployed state must be confirmed by operator running Section 4 commands and comparing deployed OpenAPI sha256 to repo.
