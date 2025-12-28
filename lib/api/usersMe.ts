import { apiGetJsonAuthed, apiPostJsonAuthed, type ApiResult } from "@/lib/api/http";
import { manualWeightIdempotencyKey } from "@/lib/events/manualWeight";

import type {
  DayKey,
  DailyFactsDto,
  InsightDto,
  InsightsResponseDto,
  IntelligenceContextDto,
  LogWeightRequestDto,
  LogWeightResponseDto,
} from "@/lib/contracts";

export type { DayKey, DailyFactsDto, InsightDto, InsightsResponseDto, IntelligenceContextDto, LogWeightRequestDto, LogWeightResponseDto };

export const getDailyFacts = async (day: string, token: string): Promise<ApiResult<DailyFactsDto>> => {
  return apiGetJsonAuthed<DailyFactsDto>(`/users/me/daily-facts?day=${encodeURIComponent(day)}`, token);
};

export const getInsights = async (day: string, token: string): Promise<ApiResult<InsightsResponseDto>> => {
  return apiGetJsonAuthed<InsightsResponseDto>(`/users/me/insights?day=${encodeURIComponent(day)}`, token);
};

export const getIntelligenceContext = async (day: string, token: string): Promise<ApiResult<IntelligenceContextDto>> => {
  return apiGetJsonAuthed<IntelligenceContextDto>(`/users/me/intelligence-context?day=${encodeURIComponent(day)}`, token);
};

export const logWeight = async (body: LogWeightRequestDto, token: string): Promise<ApiResult<LogWeightResponseDto>> => {
  return apiPostJsonAuthed<LogWeightResponseDto>(`/users/me/body/weight`, body, token, {
    idempotencyKey: manualWeightIdempotencyKey(body),
  });
};
