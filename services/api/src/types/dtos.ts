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
