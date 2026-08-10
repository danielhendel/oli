> **Historical audit artifact (non-authoritative).** Snapshot of merged `main` @ `d43ae878373534dbb4cef84c4958221ace826792` on **2026-08-10**.
> Promoted by branch `chore/consumer-launch-stage1a-truth-freeze` (Stage 1A). Do not treat as current execution truth.
> **Companions:** [repo audit](./2026-08-10-consumer-launch-repo-audit.md) · [capability matrix](./2026-08-10-consumer-launch-capability-matrix.md) · [removal register](./2026-08-10-removal-consolidation-register.md) · [roadmap (audit)](./2026-08-10-consumer-launch-roadmap.md) · [proposed progress map](./2026-08-10-proposed-repo-truth-progress-map.md)
> **Current truth:** [Repo-Truth Progress Map](../00_truth/REPO_TRUTH_PROGRESS_MAP.md) · [ROADMAP_REALITY](../10_product/roadmap/ROADMAP_REALITY.md) · [SYSTEM_STATE](../20_architecture/SYSTEM_STATE.md) · [product decisions](../10_product/decisions/CONSUMER_LAUNCH_PRODUCT_DECISIONS.md)

# Oli Consumer Launch — Capability Matrix

**Audit date:** 2026-08-10
**Merged truth:** `origin/main` @ `d43ae878373534dbb4cef84c4958221ace826792`
**Runtime smoke:** UNVERIFIED (no simulator/device session)
**Status vocabulary:** VERIFIED WORKING | IMPLEMENTED BUT RUNTIME UNVERIFIED | PARTIAL | PLACEHOLDER / MOCK | BROKEN | MISSING | DUPLICATE TRUTH | ARCHITECTURAL VIOLATION | REMOVE | MERGE / CONSOLIDATE | REPOSITION | REFACTOR BEFORE LAUNCH | DEFER | UNKNOWN

Columns: Capability · User outcome · Product layer · Route/entry · UI · State/store · Data-access · Backend · Storage · Tests · Runtime · Flag · Status · Confidence · Launch req · OS fit · Campus · Decision · Gap · Next step · Dependencies

---

## A. Identity and account

| Capability | User outcome | Layer | Route/entry | UI | State | Data | Backend | Storage | Tests | Runtime | Flag | Status | Conf | P | OS fit | Campus | Decision | Gap | Next | Deps |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| First launch | Reach auth or app | Ownership | `app/index.tsx` → `/(app)` | Redirect | AuthProvider | — | — | — | Partial route tests | UNVERIFIED | — | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | Yes | Ready | KEEP | No branded onboarding | Add onboarding | Auth |
| Sign-up | Create account | Ownership | `/(auth)/sign-up` | Email/password form | Auth actions | Firebase Auth | `onAuthCreate` profile | `users/{uid}/profile` | Auth tests sparse | UNVERIFIED | — | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | Yes | Ready | KEEP | No Apple Sign-In | Optional SIWA later | Auth |
| Sign-in | Resume session | Ownership | `/(auth)/sign-in` | Form | AuthProvider | Firebase Auth | Token verify API | Auth session | — | UNVERIFIED | — | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | Yes | Ready | KEEP | — | Device smoke | — |
| Sign-out | End session | Ownership | Settings account | Button | `signOut` | Firebase Auth | — | — | — | UNVERIFIED | — | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | Yes | Ready | KEEP | — | — | — |
| Session persistence | Stay signed in | Ownership | `lib/firebaseConfig.ts` | — | AsyncStorage persistence | Firebase Auth | — | AsyncStorage | — | UNVERIFIED | — | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | Yes | Ready | KEEP | — | — | — |
| Password reset | Recover access | Ownership | — | None | — | — | — | — | — | — | — | MISSING | H | P0 | Yes | Ready | KEEP | No `sendPasswordResetEmail` | Add reset flow | Auth |
| Email verification | Confirm email | Ownership | — | — | — | — | — | — | — | — | — | MISSING | H | P2 | Yes | — | DEFER | Not required by code | Product decision | — |
| Social / Apple Sign-In | Faster auth | Ownership | — | — | — | — | — | — | — | — | — | MISSING | H | P1 | Yes | Ready | DEFER | No expo-apple-authentication | Post-P0 | — |
| Profile | Edit identity fields | Ownership / State | `/(tabs)/profile`, `profile/edit/[field]` | ProfileMainScreen | `useUserProfileMain` | API profile | usersMe / profile | `profile/main` | Profile tests | UNVERIFIED | — | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | Yes | Ready | KEEP | Metric detail coming soon | Harden empty states | Prefs |
| Household/dependent | Family | Ownership | — | — | — | — | — | — | — | — | — | MISSING | H | Deferred | — | Extendable | DEFER | — | ADR later | — |
| Auth error states | Recoverable errors | Ownership | Auth screens | Basic | — | — | — | — | — | UNVERIFIED | — | PARTIAL | M | P0 | Yes | — | REFACTOR | Uneven messaging | Standardize | — |

---

## B. Consent and onboarding

| Capability | Outcome | Layer | Entry | Status | Conf | P | Decision | Gap | Next |
|---|---|---|---|---|---|---|---|---|---|
| Terms acceptance | Legal assent | Ownership | — | MISSING | H | P0 | KEEP | No TOS URL/UI | Host + gate |
| Privacy consent | Health data consent | Ownership | Privacy screen informational only | MISSING | H | P0 | KEEP | No consent capture | Add sequenced consent |
| HealthKit permission UX | Informed grant | Integration | AH flows | PARTIAL | M | P0 | REFACTOR | Purpose strings exist; sequencing unclear | Pre-permission education |
| Notification permission | Reminders | Platform | — | MISSING | H | Deferred | DEFER | No push stack | After plan actions |
| Onboarding persistence | Resume | Assessment | — | MISSING | H | P0 | KEEP | No onboarding stack | Build assessment-linked onboarding |
| User goals | Targets | Target | fitness-goals, weekly goals | PARTIAL | H | P0 | MERGE | Fragmented vs Program | Unify into My Plan |
| Health/fitness/nutrition/recovery assessments | Establish reality | Assessment | `profile/health-assessment` | PARTIAL | H | P0 | REFACTOR | In-memory only | Persist via API |
| Contraindications | Safety | Assessment | Assessment categories | PARTIAL | L | P1 | KEEP | Depth UNKNOWN | Clinical review |

---

## C. Data capture and integrations

| Capability | Status | Conf | P | Decision | Evidence / Gap |
|---|---|---|---|---|---|
| Apple Health / HealthKit | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | `lib/integrations/appleHealth/*`, plugin in `app.json` |
| Oura | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | OAuth + pull + scheduled `onOuraPullScheduled` |
| Withings | PARTIAL / orphaned | H | P1 | REFACTOR then KEEP or remove live UI claims | `WITHINGS_LIVE_SYNC_SUPPORTED=false` |
| Garmin | MISSING | H | Deferred | DEFER | No code |
| WHOOP | MISSING | H | Deferred | DEFER | No code |
| Manual entry | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | Weight, workouts, nutrition ingest |
| Lab / document upload | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P1 | KEEP | Labs OS + documents routes; Phase 3D-B merged |
| DEXA upload | PARTIAL | L | P2 | DEFER | Body dexa route exists; depth UNVERIFIED |
| Barcode scanning | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P1 | KEEP | `nutrition/scan.tsx` + camera permission |
| Food search | PARTIAL | M | P0 | REFACTOR | Seed catalog merges into search |
| Workout logging | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | REFACTOR BEFORE LAUNCH | `workouts/log.tsx` oversized |
| Source connection status | PARTIAL | M | P0 | KEEP | Devices + data-sources settings |
| Last sync time | PARTIAL | M | P0 | KEEP | Oura/AH meta in AsyncStorage |
| Offline capture | PARTIAL | M | P1 | KEEP | Nutrition queue / journal stores |
| Permission revocation | UNKNOWN | L | P0 | KEEP | Needs device test |

---

## D. Current State (seven domains)

| Domain | Status | Conf | P | Decision | Evidence |
|---|---|---|---|---|---|
| Seven-domain summary | PARTIAL | H | P0 | KEEP / MERGE with Daily Monitor distinction | `lib/classifications/types.ts` domains; Profile baseline |
| Body Composition | PARTIAL | M | P0 | KEEP | Body module + AH body; trends via rawEvents (violation) |
| Recovery | PARTIAL | M | P0 | KEEP | Sleep/readiness/stress; overview shell empty |
| Activity | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | Activity overview + steps DailyFacts |
| Strength | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | Workouts overview/log |
| Cardio | PARTIAL | M | P0 | KEEP | Shared training overview; yearly placeholder copy |
| Nutrition | PARTIAL | M | P0 | REFACTOR | Logging real; targets hardcoded |
| Health / Labs | PARTIAL | M | P1 | KEEP | Labs import; DNA/meds placeholders |
| Ratings / standards / gaps | PARTIAL | M | P0 | KEEP | Classification framework + sparse inputs |
| Trends | PARTIAL / ARCH VIOLATION risk | M | P0 | REFACTOR | Client-side series from rawEvents |
| Actions from state | PARTIAL | M | P0 | MERGE into Plan | Cards navigate modules; no unified actions |

---

## E. Today / Daily experience

| Capability | Status | Conf | P | Decision | Evidence |
|---|---|---|---|---|---|
| Dash / Daily Monitor | PARTIAL | M | P0 | KEEP as Today | `dash.tsx` + DailyMonitorHost; flags default ON |
| Answers “what now?” | PARTIAL | M | P0 | REFACTOR | Presence cards; limited plan actions |
| Distinct from Current State | PARTIAL | M | P0 | REPOSITION | Product copy/IA decision needed |
| Daily recap | PLACEHOLDER / MOCK | H | P2 | DEFER | `dash/daily-recap.tsx` Coming soon |
| Command Center | PARTIAL / DUPLICATE | H | P1 | MERGE / CONSOLIDATE | `/command-center` orphaned from dock |

---

## F. My Plan

| Capability | Status | Conf | P | Decision | Evidence |
|---|---|---|---|---|---|
| Coordinated My Plan | MISSING | H | P0 | KEEP (build) | No single plan document |
| Program tab | PARTIAL | H | P0 | REFACTOR | `currentPrograms=[]` |
| Weekly fitness goals | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | MERGE into Plan | Preferences API |
| Workout program builder | PARTIAL | M | P1 | KEEP draft→persist | In-memory store |
| Cardio/nutrition/recovery builders | PLACEHOLDER / MOCK | H | P1 | DEFER or build | Placeholder screens |
| Plan versions / history / adaptation | MISSING | H | P0–P1 | KEEP (build) | No matches for planVersion/weekly review |
| Professional approval | MISSING | H | Deferred | DEFER | Pro app mock only |

---

## G. Execution

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Start/complete strength workout | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | REFACTOR BEFORE LAUNCH | Logger huge; journal + ingest |
| Exercise instructions / media | PARTIAL | M | P1 | KEEP | Media OS / thumbnails |
| Cardio log | PARTIAL | M | P0 | KEEP | Cardio routes |
| Nutrition meal log | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | Meals + search |
| Recovery action completion | PARTIAL | L | P1 | KEEP | Mostly monitoring, not prescribed actions |
| Provenance on edits | PARTIAL | M | P0 | KEEP | RawEvent model; UI uneven |
| Accessibility | PARTIAL | M | P0 | REFACTOR | Some a11y tests; not systemic audit |

---

## H. Monitoring and records

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Timeline day log | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP (secondary nav) | Hidden in Health v1 dock |
| Library / lineage / replay | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P1 | KEEP | Phase 1 trust routes |
| Module histories/calendars | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | MERGE overlaps | Many parallel calendars |
| Failures | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | KEEP | `/failures` |
| Labs longitudinal | PARTIAL | M | P1 | KEEP | History after Phase 3D-B |
| Competing history surfaces | DUPLICATE TRUTH risk | M | P0 | MERGE | Timeline vs module lists vs Library |

---

## I. Review and adaptation

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Weekly / monthly review | MISSING | H | P0 | KEEP (build) | Lab review ≠ plan review |
| Plan effectiveness / adherence | MISSING | H | P1 | KEEP | — |
| Next plan version | MISSING | H | P0 | KEEP | — |
| AI-generated review | MISSING | H | Deferred | DEFER | Vision forbids ungrounded AI |

---

## J. Education and understanding

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Library (trust lenses) | PARTIAL | M | P1 | REPOSITION | Not content education; event lenses |
| Metric explainers | PARTIAL | M | P0 | KEEP | Various `*-explainer` routes |
| Health disclaimers | PARTIAL | L | P0 | KEEP | Classification non-diagnostic language; legal URLs missing |
| Contextual education at decision | PARTIAL | L | P1 | MERGE | Prefer embed vs separate library content |

---

## K. Professional support

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Professional portal | PLACEHOLDER / MOCK | H | Deferred | DEFER | `apps/professional` mock clients |
| Coach connection in consumer | MISSING | H | Deferred | DEFER | No assignment API |
| Secure messaging | MISSING | H | Deferred | DEFER | — |

---

## L. Ownership, privacy, trust

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Data export API | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | KEEP | `POST /export` |
| Data export UI | MISSING | H | P0 | KEEP (build) | Privacy copy only |
| Account delete API | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | KEEP | `POST /account/delete` |
| Account delete UI | MISSING | H | P0 | KEEP (build) | App Store blocker |
| Audit / access history UX | MISSING | H | P1 | KEEP | Telemetry ≠ user audit log |
| Privacy policy / Terms URLs | MISSING | H | P0 | KEEP | — |
| Retention gaps disclosed | PARTIAL | H | P0 | KEEP | Registry lists gaps |
| PII in logs | PARTIAL / risk | M | P0 | REFACTOR | Device/oura/sleep debug logs in source |
| User-scoped storage | VERIFIED WORKING (static) | H | P0 | KEEP | Rules + API paths |

---

## M. Subscription / entitlement

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| IAP / paywall / restore | MISSING | H | Deferred | DEFER | No StoreKit/RevenueCat |
| Entitlement checks | MISSING | H | Deferred | DEFER | Needs ADR before Campus |

---

## N. Reliability and operations

| Capability | Status | Conf | P | Decision | Notes |
|---|---|---|---|---|---|
| Sentry / Crashlytics | MISSING | H | P0 | KEEP (add) | — |
| Privacy-safe API telemetry | IMPLEMENTED BUT RUNTIME UNVERIFIED | M | P0 | KEEP | `apiAccessTelemetry`, mobile HTTP telemetry |
| Feature flags | PARTIAL | H | P0 | REFACTOR | Compile-time EXPO_PUBLIC only |
| Reprocessing / admin recompute | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P1 | KEEP | Admin HTTP + ledger |
| Failures visible | IMPLEMENTED BUT RUNTIME UNVERIFIED | H | P0 | KEEP | — |
| Push notifications | MISSING | H | Deferred | DEFER | — |

---

## Priority legend

- **P0** — required for first consumer closed-loop launch
- **P1** — immediate expansion after launch
- **P2 / Deferred** — later platform / Campus / breadth

## Matrix coverage note

This matrix enumerates audit-required capability groups with evidence pointers. Individual sub-rows marked UNKNOWN require device or staging runtime probes not performed on 2026-08-10.
