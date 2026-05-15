// services/api/src/types/dtos.ts

export { dailyFactsDtoSchema } from "@oli/contracts/dailyFacts";
export type { DailyFactsDto } from "@oli/contracts/dailyFacts";

export {
  insightSeveritySchema,
  insightEvidencePointDtoSchema,
  insightDtoSchema,
  insightsResponseDtoSchema,
} from "@oli/contracts/insights";
export type { InsightDto, InsightsResponseDto } from "@oli/contracts/insights";

export { intelligenceContextDtoSchema } from "@oli/contracts/intelligenceContext";
export type { IntelligenceContextDto } from "@oli/contracts/intelligenceContext";

export { logWeightRequestDtoSchema, logWeightResponseDtoSchema } from "@oli/contracts/weight";
export type { LogWeightRequestDto, LogWeightResponseDto } from "@oli/contracts/weight";

// ✅ Step 4 — Derived Ledger replay contracts
export {
  derivedLedgerRunSummaryDtoSchema,
  derivedLedgerRunsResponseDtoSchema,
  derivedLedgerReplayResponseDtoSchema,
} from "@oli/contracts/derivedLedger";
export type {
  DerivedLedgerRunSummaryDto,
  DerivedLedgerRunsResponseDto,
  DerivedLedgerReplayResponseDto,
} from "@oli/contracts/derivedLedger";

// Sprint 1 — Retrieval Surfaces
export {
  rawEventListItemSchema,
  rawEventsListResponseDtoSchema,
  canonicalEventListItemSchema,
  canonicalEventsListResponseDtoSchema,
  timelineDaySchema,
  timelineResponseDtoSchema,
  lineageResponseDtoSchema,
  rawEventsListQuerySchema,
  canonicalEventsListQuerySchema,
  timelineQuerySchema,
  lineageQuerySchema,
} from "@oli/contracts/retrieval";
export type {
  RawEventListItem,
  RawEventsListResponseDto,
  CanonicalEventListItem,
  CanonicalEventsListResponseDto,
  TimelineDay,
  TimelineResponseDto,
  LineageResponseDto,
} from "@oli/contracts/retrieval";

// Phase 1.5 Sprint 1 — Health Score (derived truth read surface)
export { healthScoreDocSchema } from "@oli/contracts/healthScore";
export type { HealthScoreDoc } from "@oli/contracts/healthScore";

// Phase 1.5 Sprint 4 — Health Signals (derived truth read surface)
export { healthSignalDocSchema } from "@oli/contracts/healthSignals";
export type { HealthSignalDoc } from "@oli/contracts/healthSignals";

// Oura Tier 1 — Sleep & Readiness view (vendor snapshot read surface)
export {
  sleepViewDtoSchema,
  readinessViewDtoSchema,
} from "@oli/contracts/ouraVendor";
export type { SleepViewDto, ReadinessViewDto } from "@oli/contracts/ouraVendor";

// Canonical SleepNight read surface (GET /users/me/sleep-night)
export { sleepNightViewDtoSchema, sleepNightDocumentSchema } from "@oli/contracts/sleepNight";
export type { SleepNightViewDto, SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts/sleepNight";

// Nutrition — dev food catalog read surface (GET /users/me/nutrition/*)
export {
  nutritionFoodSearchResponseDtoSchema,
  nutritionFoodDetailResponseDtoSchema,
} from "@oli/contracts/nutritionFoodSearch";
export type {
  NutritionFoodSearchResponseDto,
  NutritionFoodDetailResponseDto,
} from "@oli/contracts/nutritionFoodSearch";

export { nutritionMetaDtoSchema } from "@oli/contracts/nutritionMeta";
export type { NutritionMetaDto } from "@oli/contracts/nutritionMeta";
