// lib/contracts/index.ts

export * from "./rawEvent";
export * from "./dailyFacts";
export * from "./activityStepsResolution";
export * from "./derivedLedger";
export * from "./insights";
export * from "./intelligenceContext";
export * from "./day";
export * from "./localCalendarDayKey";
export * from "./dayTruth";
export * from "./failure";
export * from "./weight";

// ✅ Preferences (Phase 1)
export * from "./preferences";

// User profile main doc (`users/{uid}/profile/main`)
export * from "./userProfileMain";
export * from "./bodyReadSources";

// User-owned exercise definitions (`users/{uid}/exerciseDefinitions/{exerciseId}`)
export * from "./exerciseDefinition";

// ✅ Labs Biomarkers v0 ( Sprint 2.9 )
export * from "./labResults";

// Workout day summary read model (Calendar markers)
export * from "./workoutDaySummary";

// Workout month summary read model (Overview analytics year)
export * from "./workoutMonthSummary";

// Sprint 1 — Retrieval Surfaces
export * from "./retrieval";

// Workout summary rebuild bounds (range validation + helpers)
export * from "./workoutSummaryRebuildLimits";

// Sprint 2.8 — Uploads Presence
export * from "./uploads";

// Phase 1 Lock #3 — Canonical readiness vocabulary
export * from "./readiness";

// Phase 1 Lock #6 — Export job model
export * from "./export";

// Phase 1.5 Sprint 1 — Health Score v1.0 (derived truth)
export * from "./healthScore";

// Phase 1.5 Sprint 4 — Health Signals v1 (derived truth)
export * from "./healthSignals";

// Phase 1.5 Sprint 5 — Epistemic transparency (UI-only view model)
export * from "./provenance";

// Oura Tier 1 — vendor snapshots and view DTOs (Sleep & Readiness)
export * from "./ouraVendor";

// Canonical sleep night read model (Oura → sleepNights + GET /users/me/sleep-night)
export * from "./sleepNight";

// Oli Sleep Score v1 (derived from DailyFacts.sleep)
export * from "./oliSleepScore";

// Nutrition — read surfaces (food search proxy; dev catalog)
export * from "./nutritionFoodSearch";

// Nutrition — user preferences (recent/favorites)
export * from "./nutritionMeta";
