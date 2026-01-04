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
  DayTruthDto,
} from "@/lib/contracts";

export type TruthGetOptions = {
  cacheBust?: string;
};

function truthGetOpts(opts?: TruthGetOptions) {
  return {
    noStore: true as const,
    ...(opts?.cacheBust ? { cacheBust: opts.cacheBust } : {}),
  };
}

export const logWeight = async (
  payload: LogWeightRequestDto,
  idToken: string,
): Promise<ApiResult<LogWeightResponseDto>> => {
  // Ensure no accidental undefined fields sneak into the JSON body.
  // (JSON.stringify will drop undefined, but this also enforces a clean shape.)
  const clean: LogWeightRequestDto = {
    time: payload.time,
    timezone: payload.timezone,
    weightKg: payload.weightKg,
    ...(payload.day ? { day: payload.day } : {}),
    ...(payload.bodyFatPercent === undefined ? {} : { bodyFatPercent: payload.bodyFatPercent }),
  };

  return apiPostJsonAuthed<LogWeightResponseDto>("/users/me/body/weight", clean, idToken, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: manualWeightIdempotencyKey(clean),
  });
};

export const getDailyFacts = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DailyFactsDto>> => {
  return apiGetJsonAuthed<DailyFactsDto>(
    `/users/me/daily-facts?day=${encodeURIComponent(day)}`,
    idToken,
    truthGetOpts(opts),
  );
};

export const getInsights = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<InsightsResponseDto>> => {
  return apiGetJsonAuthed<InsightsResponseDto>(
    `/users/me/insights?day=${encodeURIComponent(day)}`,
    idToken,
    truthGetOpts(opts),
  );
};

export const getIntelligenceContext = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<IntelligenceContextDto>> => {
  return apiGetJsonAuthed<IntelligenceContextDto>(
    `/users/me/intelligence-context?day=${encodeURIComponent(day)}`,
    idToken,
    truthGetOpts(opts),
  );
};

/**
 * Truth surface for UI readiness gating.
 */
export const getDayTruth = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DayTruthDto>> => {
  return apiGetJsonAuthed<DayTruthDto>(
    `/users/me/day-truth?day=${encodeURIComponent(day)}`,
    idToken,
    truthGetOpts(opts),
  );
};
