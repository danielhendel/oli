// lib/contracts/index.ts

export * from "./rawEvent";
export * from "./dailyFacts";
export * from "./activityStepsResolution";
export * from "./derivedLedger";
export * from "./insights";
export * from "./intelligenceContext";
export * from "./day";
export * from "./dayTruth";
export * from "./failure";
export * from "./weight";

// ✅ Preferences (Phase 1)
export * from "./preferences";

// User profile main doc (`users/{uid}/profile/main`)
export * from "./userProfileMain";
export * from "./bodyReadSources";

// ✅ Labs Biomarkers v0 ( Sprint 2.9 )
export * from "./labResults";

// Workout day summary read model (Calendar markers)
export * from "./workoutDaySummary";

// Workout month summary read model (Overview analytics year)
export * from "./workoutMonthSummary";

// Sprint 1 — Retrieval Surfaces
export * from "./retrieval";

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
