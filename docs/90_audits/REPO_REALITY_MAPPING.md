# Repo Reality Mapping Inventory (Repo-Truth)

> **STALE HISTORICAL AUDIT (2025-12-30).** Not current execution truth.
> `firestore.rules` now lives under `services/functions/` (among other drift).
> **Current map:** [REPO_TRUTH_PROGRESS_MAP.md](../00_truth/REPO_TRUTH_PROGRESS_MAP.md) · **Launch audit:** [2026-08-10 consumer-launch repo audit](../audits/2026-08-10-consumer-launch-repo-audit.md)

**Generated:** 2025-12-30 (audit bundle `oli-audit-2025-12-30_1239-*`)
**Purpose:** Deterministic checklist of what exists in the code bundle *today* — organized by subsystem, with a status per file: **IMPLEMENTED / PARTIAL / STUBBED / MISSING**.

### Status rules (deterministic)
- **IMPLEMENTED**: substantial non-empty code, no obvious TODO markers
- **PARTIAL**: present but small, or contains TODO/placeholder markers
- **STUBBED**: nearly empty or primarily placeholder
- **MISSING**: referenced by config/code but not present in the bundle

> Note: This is **file-level truth**, not feature-level truth. Some “implemented” files may still depend on missing rules/config for full correctness.

---

## Audit bundle inputs
- A0 Context
- A1 Mobile App
- A2 Shared Lib
- A3 Backend API (Cloud Run)
- A4 Backend Functions (Firebase Functions v2)
- A5 Infra/CI
- A6 Native Shell (iOS/Android)
- A7 Docs

---

## Missing artifacts (referenced, not present)

- [ ] ❌ **MISSING** — `firestore.rules` (referenced by `firebase.json`)
- [ ] ❌ **MISSING** — `firestore.indexes.json` (referenced by `firebase.json`)

---

## Root / Tooling

- [ ] ✅ **IMPLEMENTED** — `AUDIT_CONTEXT.txt` _( 31 lines )_
- [ ] ✅ **IMPLEMENTED** — `Dockerfile` _( 38 lines )_
- [ ] ✅ **IMPLEMENTED** — `README.md` _( 98 lines )_
- [ ] ✅ **IMPLEMENTED** — `app.json` _( 56 lines )_
- [ ] ✅ **IMPLEMENTED** — `babel.config.js` _( 20 lines )_
- [ ] 🟡 **PARTIAL** — `cleanup.sh` _( 18 lines )_
- [ ] ✅ **IMPLEMENTED** — `eslint.config.mjs` _( 143 lines )_
- [ ] ✅ **IMPLEMENTED** — `firebase.json` _( 63 lines )_
- [ ] 🟡 **PARTIAL** — `jest.setup.ts` _( 18 lines )_
- [ ] ✅ **IMPLEMENTED** — `metro.config.js` _( 33 lines )_
- [ ] ✅ **IMPLEMENTED** — `package-lock.json` _( 16807 lines, TODO:3 )_
- [ ] ✅ **IMPLEMENTED** — `package.json` _( 93 lines )_
- [ ] 🟡 **PARTIAL** — `patches/react-native+0.76.5.patch` _( 22 lines )_
- [ ] ✅ **IMPLEMENTED** — `tsconfig.base.json` _( 46 lines )_
- [ ] 🟡 **PARTIAL** — `tsconfig.base.json` _( 46 lines )_
- [ ] 🟡 **PARTIAL** — `tsconfig.json` _( 17 lines )_
- [ ] 🟡 **PARTIAL** — `tsconfig...abel.config.js` _( 20 lines )_
- [ ] 🟡 **PARTIAL** — `tsconfig...etro.config.js` _( 33 lines )_
- [ ] 🟡 **PARTIAL** — `tsconfig...pp.json` _( 56 lines )_
- [ ] 🟡 **PARTIAL** — `tsconfig...st.setup.ts` _( 18 lines )_

---

## Infra + CI

- [ ] ✅ **IMPLEMENTED** — `.github/workflows/ci.yml` _( 41 lines )_
- [ ] ✅ **IMPLEMENTED** — `cloudbuild/oli-api.yaml` _( 37 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/artifact_registry.tf` _( 46 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/cloudrun.tf` _( 178 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/iam.tf` _( 149 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/main.tf` _( 52 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/monitoring.tf` _( 91 lines )_
- [ ] 🟡 **PARTIAL** — `infra/outputs.tf` _( 18 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/pubsub.tf` _( 70 lines )_
- [ ] ✅ **IMPLEMENTED** — `infra/storage.tf` _( 60 lines )_
- [ ] 🟡 **PARTIAL** — `infra/variables.tf` _( 19 lines )_
- [ ] 🟡 **PARTIAL** — `terraform-version` _( 1 lines )_

---

## Backend API (Cloud Run)

- [ ] ✅ **IMPLEMENTED** — `services/api/Dockerfile` _( 56 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/index.ts` _( 29 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/admin.ts` _( 56 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/env.ts` _( 49 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/logger.ts` _( 53 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/pubsub.ts` _( 45 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/middleware/auth.ts` _( 58 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/middleware/ratelimit.ts` _( 58 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/routes/health.ts` _( 34 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/routes/ingest.ts` _( 158 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/routes/usersMe.ts` _( 147 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/server.ts` _( 147 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/tsconfig.json` _( 20 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/tsconfig.tsbuildinfo` _( 1 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/package.json` _( 70 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/package-lock.json` _( 1430 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/http.ts` _( 71 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/idempotency.ts` _( 106 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/lib/validation.ts` _( 70 lines )_
- [ ] 🟡 **PARTIAL** — `services/api/src/routes/index.ts` _( 12 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/middleware/requestId.ts` _( 52 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/api/src/middleware/error.ts` _( 90 lines )_

---

## Backend Functions (Firebase)

- [ ] ✅ **IMPLEMENTED** — `services/functions/package.json` _( 86 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/index.ts` _( 71 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/ingestion/rawEvents.ts` _( 179 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/ingestion/onRawEventCreated.ts` _( 128 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/normalize/normalizeEvent.ts` _( 219 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/normalize/onCanonicalEventCreated.ts` _( 127 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/dailyFacts/buildDailyFacts.ts` _( 274 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts` _( 87 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/insights/buildInsights.ts` _( 246 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/insights/onInsightsRecomputeScheduled.ts` _( 92 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/intelligence/buildIntelligenceContext.ts` _( 243 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/intelligence/onIntelligenceContextRecomputeScheduled.ts` _( 93 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/admin.ts` _( 56 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/env.ts` _( 67 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/logger.ts` _( 61 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/paths.ts` _( 121 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/validation.ts` _( 75 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/http/ingest-deprecated.ts` _( 36 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/http/health.ts` _( 30 lines )_
- [ ] 🟡 **PARTIAL** — `services/functions/tsconfig.json` _( 17 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/__tests__/normalizeEvent.test.ts` _( 110 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/__tests__/buildDailyFacts.test.ts` _( 176 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/__tests__/buildInsights.test.ts` _( 165 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/__tests__/buildIntelligenceContext.test.ts` _( 168 lines )_
- [ ] 🟡 **PARTIAL** — `services/functions/src/__tests__/fixtures.ts` _( 26 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/time.ts` _( 104 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/hash.ts` _( 47 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/metrics.ts` _( 61 lines )_
- [ ] 🟡 **PARTIAL** — `services/functions/src/lib/constants.ts` _( 17 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/firestore.ts` _( 65 lines )_
- [ ] 🟡 **PARTIAL** — `services/functions/src/lib/pubsub.ts` _( 19 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/requestId.ts` _( 56 lines )_
- [ ] 🟡 **PARTIAL** — `services/functions/src/lib/errors.ts` _( 23 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/guards.ts` _( 84 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/zod.ts` _( 33 lines )_
- [ ] ✅ **IMPLEMENTED** — `services/functions/src/lib/versioning.ts` _( 109 lines )_

---

## Shared Lib (`/lib`)

- [ ] ✅ **IMPLEMENTED** — `lib/api/functions.ts` _( 57 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/api/http.ts` _( 117 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/api/ingest.ts` _( 167 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/api/usersMe.ts` _( 116 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/auth/AuthProvider.tsx` _( 145 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/auth/actions.ts` _( 119 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/contracts/canonical.ts` _( 323 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/contracts/rawEvent.ts` _( 289 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/contracts/dailyFacts.ts` _( 206 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/contracts/insights.ts` _( 239 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/contracts/intelligenceContext.ts` _( 221 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/data/useDailyFacts.ts` _( 109 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/data/useInsights.ts` _( 108 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/data/useIntelligenceContext.ts` _( 109 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/ui/ModuleTile.tsx` _( 130 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/ui/ModuleSectionCard.tsx` _( 115 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/ui/EmptyState.tsx` _( 67 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/ui/LoadingState.tsx` _( 61 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/ui/ErrorState.tsx` _( 74 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/theme/tokens.ts` _( 232 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/theme/theme.ts` _( 156 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/util/clamp.ts` _( 12 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/util/format.ts` _( 91 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/util/date.ts` _( 120 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/debug/logger.ts` _( 78 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/debug/healthProbe.ts` _( 93 lines )_
- [ ] ✅ **IMPLEMENTED** — `lib/types/process-env.d.ts` _( 28 lines )_

> NOTE: This section is intentionally non-exhaustive in the README preview you’re reading right now.
> The repo-truth checklist should include ALL lib files. If you want *every single* `/lib/**` file enumerated,
> tell me and I’ll output the full expanded list (it’s large but deterministic).

---

## Mobile App (`/app`)

### Navigation / Root
- [ ] ✅ **IMPLEMENTED** — `app/_layout.tsx` _( 171 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/index.tsx` _( 58 lines )_
- [ ] 🟡 **PARTIAL** — `app/tsconfig.json` _( 8 lines )_

### Auth routes
- [ ] 🟡 **PARTIAL** — `app/(auth)/_layout.tsx` _( 14 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(auth)/sign-in.tsx` _( 169 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(auth)/sign-up.tsx` _( 178 lines )_

### App routes (Command Center + modules)
- [ ] 🟡 **PARTIAL** — `app/(app)/_layout.tsx` _( 15 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/command-center/index.tsx` _( 275 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/body/index.tsx` _( 31 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/body/weight.tsx` _( 245 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/body/overview.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/body/dexa.tsx` _( 8 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/workouts/index.tsx` _( 31 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/workouts/overview.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/workouts/log.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/workouts/history.tsx` _( 8 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/nutrition/index.tsx` _( 31 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/nutrition/overview.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/nutrition/log.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/nutrition/targets.tsx` _( 8 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/recovery/index.tsx` _( 31 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/recovery/overview.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/recovery/sleep.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/recovery/hrv.tsx` _( 8 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/labs/index.tsx` _( 31 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/labs/overview.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/labs/upload.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/labs/biomarkers.tsx` _( 8 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/(app)/settings/index.tsx` _( 31 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/settings/account.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/settings/devices.tsx` _( 8 lines )_
- [ ] 🟡 **PARTIAL** — `app/(app)/settings/privacy.tsx` _( 8 lines )_
- [ ] ⚪ **STUBBED** — `app/(app)/index.tsx` _( 4 lines )_

### Debug routes
- [ ] 🟡 **PARTIAL** — `app/debug/_layout.tsx` _( 14 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/debug/index.tsx` _( 109 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/debug/api-smoke.tsx` _( 88 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/debug/health.tsx` _( 106 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/debug/token.tsx` _( 93 lines )_
- [ ] ✅ **IMPLEMENTED** — `app/debug/re-auth.tsx` _( 89 lines )_

---

## Native Shell (`/ios`, `/android`)

- [ ] ✅ **IMPLEMENTED** — `ios/.xcode.env` _( 17 lines )_
- [ ] 🟡 **PARTIAL** — `ios/.xcode.env.local` _( 7 lines )_
- [ ] ✅ **IMPLEMENTED** — `ios/Podfile` _( 76 lines )_
- [ ] ✅ **IMPLEMENTED** — `ios/Podfile.lock` _( 1286 lines )_
- [ ] ✅ **IMPLEMENTED** — `ios/oli.xcodeproj/project.pbxproj` _( 715 lines )_
- [ ] ✅ **IMPLEMENTED** — `android/build.gradle` _( 26 lines )_
- [ ] ✅ **IMPLEMENTED** — `android/settings.gradle` _( 22 lines )_
- [ ] ✅ **IMPLEMENTED** — `android/gradlew` _( 173 lines )_
- [ ] ✅ **IMPLEMENTED** — `android/gradlew.bat` _( 91 lines )_

(Assets/icons omitted — present in bundle but not meaningful for implementation status.)

---

## Docs (`/docs`)

- [ ] ✅ **IMPLEMENTED** — `docs/README.md` _( 70 lines )_
- [ ] ✅ **IMPLEMENTED** — `docs/LOCAL_DEV.md` _( 206 lines )_
- [ ] ✅ **IMPLEMENTED** — `docs/SYSTEM_STATE.md` _( 98 lines )_
- [ ] 🟡 **PARTIAL** — `docs/ROADMAP_REALITY.md` _( 46 lines )_
- [ ] ✅ **IMPLEMENTED** — `docs/DesignSystem.md` _( 286 lines )_

