// lib/api/usersMe.ts
import type { ApiResult } from "@/lib/api/http";
import { apiGetJsonAuthed, apiPostJsonAuthed } from "@/lib/api/http";
import { manualWeightIdempotencyKey } from "@/lib/events/manualWeight";

import type {
  LogWeightRequestDto,
  LogWeightResponseDto,
  DailyFactsDto,
  InsightsResponseDto,
  IntelligenceContextDto,
} from "@/lib/contracts";

export const logWeight = async (
  payload: LogWeightRequestDto,
  idToken: string,
): Promise<ApiResult<LogWeightResponseDto>> => {
  const idempotencyKey = manualWeightIdempotencyKey(payload);
  return apiPostJsonAuthed<LogWeightResponseDto>("/users/me/body/weight", payload, idToken, { idempotencyKey });
};

export const getDailyFacts = async (day: string, idToken: string): Promise<ApiResult<DailyFactsDto>> => {
  return apiGetJsonAuthed<DailyFactsDto>(`/users/me/daily-facts?day=${encodeURIComponent(day)}`, idToken);
};

export const getInsights = async (day: string, idToken: string): Promise<ApiResult<InsightsResponseDto>> => {
  return apiGetJsonAuthed<InsightsResponseDto>(`/users/me/insights?day=${encodeURIComponent(day)}`, idToken);
};

export const getIntelligenceContext = async (day: string, idToken: string): Promise<ApiResult<IntelligenceContextDto>> => {
  return apiGetJsonAuthed<IntelligenceContextDto>(`/users/me/intelligence-context?day=${encodeURIComponent(day)}`, idToken);
};
