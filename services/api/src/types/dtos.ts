// services/api/src/types/dtos.ts
export { dailyFactsDtoSchema } from "../../../../lib/contracts/dailyFacts";
export type { DailyFactsDto } from "../../../../lib/contracts/dailyFacts";

export {
  insightSeveritySchema,
  insightEvidencePointDtoSchema,
  insightDtoSchema,
  insightsResponseDtoSchema,
} from "../../../../lib/contracts/insights";
export type { InsightDto, InsightsResponseDto } from "../../../../lib/contracts/insights";

export { intelligenceContextDtoSchema } from "../../../../lib/contracts/intelligenceContext";
export type { IntelligenceContextDto } from "../../../../lib/contracts/intelligenceContext";

export { logWeightRequestDtoSchema, logWeightResponseDtoSchema } from "../../../../lib/contracts/weight";
export type { LogWeightRequestDto, LogWeightResponseDto } from "../../../../lib/contracts/weight";
