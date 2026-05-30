/**
 * Apple Health (HealthKit) W1 integration.
 * Permission request on explicit action; manual sync; deterministic idempotency keys.
 */

export {
  requestPermissions,
  getBodyCompositionReadAuthStatus,
  pullTodaySnapshot,
  pullAnchoredWorkouts,
  pullWorkoutsByDateRange,
  pullBodyCompositionSamples,
  buildAppleHealthBodyMassSampleQueryOptions,
  toHealthKitIso8601,
  getLocalCalendarDayBoundsFromYmd,
  addLocalCalendarDaysToDayKey,
  pullStepCountForLocalCalendarDay,
  buildHealthKitGetStepCountOptions,
  getStepCountForDateRange,
  diagnoseStepCountForWindow,
  buildAppleHealthWorkoutPhysiologyProbe,
  runAppleHealthWorkoutPhysiologyDiagnostic,
  runAppleHealthWorkoutPhysiologyEnrichment,
} from "./healthKit";
export {
  enrichWorkoutPhysiologyForIngest,
  shouldEnableWorkoutPhysiologyV1,
  WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS,
  WORKOUT_PHYSIOLOGY_POST_HR_WINDOW_SECONDS,
} from "./enrichWorkoutPhysiologyForIngest";
export type {
  WorkoutPhysiologyEnrichmentBlock,
  WorkoutPhysiologyEnrichmentOptions,
  WorkoutPhysiologyZoneBasis,
} from "./enrichWorkoutPhysiologyForIngest";
export {
  resolveWorkoutHrZoneThresholds,
  classifyHrSampleToZoneIndex,
  DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM,
  WORKOUT_HR_ZONE_BASIS_MODEL_VERSION_V1,
} from "./resolveWorkoutHrZoneThresholds";
export type {
  WorkoutHrZoneBasisModelVersion,
  WorkoutHrZoneThresholdsResolution,
} from "./resolveWorkoutHrZoneThresholds";
export type {
  DiagnoseStepWindowEntry,
  DiagnoseStepWindowResult,
} from "./healthKit";
export {
  APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL,
  DEFAULT_WORKOUT_PHYSIOLOGY_PADDING_MS,
  diagnoseWorkoutPhysiologyForWindow,
  shouldLogAppleHealthPhysiologyDiagnostics,
} from "./diagnoseWorkoutPhysiology";
export type {
  WorkoutForDiagnostic,
  WorkoutPhysiologyDiagnostic,
  WorkoutPhysiologyAvailabilityFlags,
  WorkoutPhysiologyErrors,
  WorkoutPhysiologyHealthKitProbe,
  WorkoutPhysiologyHrSample,
  DiagnoseWorkoutPhysiologyOptions,
} from "./diagnoseWorkoutPhysiology";
export type { BodyCompositionReadAuthStatusResult } from "./healthKit";
export {
  runWorkoutHistoryBackfillPasses,
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
} from "./runWorkoutHistoryBackfill";
export type { RunWorkoutHistoryBackfillResult } from "./runWorkoutHistoryBackfill";
export {
  stepsIdempotencyKey,
  workoutIdempotencyKey,
  appleHealthBodyWeightIdempotencyKey,
  appleHealthBodyCompositionIdempotencyKey,
  restingHeartRateIdempotencyKey,
  appleExerciseTimeIdempotencyKey,
  activeEnergyIdempotencyKey,
} from "./idempotency";
export {
  runAppleHealthBodySync,
  type RunAppleHealthBodySyncDeps,
  type RunAppleHealthBodySyncResult,
} from "./runAppleHealthBodySync";
export {
  runAppleHealthBodyBackfill,
  isoYearsAgoFromNow,
  APPLE_HEALTH_BODY_BACKFILL_YEARS,
  APPLE_HEALTH_BODY_BACKFILL_CHUNK_DAYS,
  type RunAppleHealthBodyBackfillDeps,
  type RunAppleHealthBodyBackfillResult,
} from "./runAppleHealthBodyBackfill";
export {
  runAppleHealthStepsBackfill,
  APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS,
  type RunAppleHealthStepsBackfillDeps,
  type RunAppleHealthStepsBackfillResult,
} from "./runAppleHealthStepsBackfill";
export type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";
