// lib/api/usersMe.ts
import type { ApiResult } from "@/lib/api/http";
import { apiGetJsonAuthed, apiPostJsonAuthed } from "@/lib/api/http";
import { manualWeightIdempotencyKey } from "@/lib/events/manualWeight";
import {
  manualStrengthWorkoutIdempotencyKey,
  type ManualStrengthWorkoutPayload,
} from "@/lib/events/manualStrengthWorkout";

import type {
  LogWeightRequestDto,
  LogWeightResponseDto,
  DailyFactsDto,
  InsightsResponseDto,
  IntelligenceContextDto,
  DayTruthDto,
  LabResultDto,
  LabResultsListResponseDto,
  CreateLabResultRequestDto,
} from "@/lib/contracts";

export type LogStrengthWorkoutResponseDto = { ok: true; rawEventId: string; day?: string };

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
  // (JSON.stringify drops undefined, but this enforces a clean shape.)
  const clean: LogWeightRequestDto = {
    time: payload.time,
    timezone: payload.timezone,
    weightKg: payload.weightKg,
    ...(payload.day ? { day: payload.day } : {}),
    ...(payload.bodyFatPercent === undefined ? {} : { bodyFatPercent: payload.bodyFatPercent }),
  };

  // ✅ Canonical ingestion envelope (single front door)
  // Server is authoritative for day; we still include payload.day when present for back-compat.
  const ingestBody = {
    provider: "manual",
    kind: "weight",
    observedAt: clean.time,
    sourceId: "manual",
    payload: clean,
  };

  // ✅ This must hit POST /ingest (events router is mounted at /ingest and uses router.post("/"))
  return apiPostJsonAuthed<LogWeightResponseDto>("/ingest", ingestBody, idToken, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: manualWeightIdempotencyKey(clean),
  });
};

export const logStrengthWorkout = async (
  payload: ManualStrengthWorkoutPayload,
  idToken: string,
): Promise<ApiResult<LogStrengthWorkoutResponseDto>> => {
  const ingestBody = {
    provider: "manual",
    kind: "strength_workout",
    observedAt: payload.startedAt,
    sourceId: "manual",
    timeZone: payload.timeZone,
    payload,
  };

  return apiPostJsonAuthed<LogStrengthWorkoutResponseDto>("/ingest", ingestBody, idToken, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: manualStrengthWorkoutIdempotencyKey(payload),
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

export type UploadsPresenceResponseDto = {
  ok: true;
  count: number;
  latest: {
    rawEventId: string;
    observedAt: string;
    receivedAt: string;
    originalFilename?: string;
    mimeType?: string;
  } | null;
};

export const getUploads = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<UploadsPresenceResponseDto>> => {
  return apiGetJsonAuthed<UploadsPresenceResponseDto>("/users/me/uploads", idToken, truthGetOpts(opts));
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

// ----------------------------
// Sprint 2.9 — Labs Biomarkers v0
// ----------------------------

export type CreateLabResultResponseDto = { ok: true; id: string; idempotentReplay?: true };

export const getLabResults = async (
  idToken: string,
  opts?: { limit?: number } & TruthGetOptions,
): Promise<ApiResult<LabResultsListResponseDto>> => {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiGetJsonAuthed<LabResultsListResponseDto>(
    `/users/me/labResults${qs ? `?${qs}` : ""}`,
    idToken,
    truthGetOpts(opts),
  );
};

export const getLabResult = async (
  id: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<LabResultDto>> => {
  return apiGetJsonAuthed<LabResultDto>(
    `/users/me/labResults/${encodeURIComponent(id)}`,
    idToken,
    truthGetOpts(opts),
  );
};

export const createLabResult = async (
  payload: CreateLabResultRequestDto,
  idToken: string,
  idempotencyKey: string,
): Promise<ApiResult<CreateLabResultResponseDto>> => {
  return apiPostJsonAuthed<CreateLabResultResponseDto>(
    "/users/me/labResults",
    payload,
    idToken,
    {
      timeoutMs: 15000,
      noStore: true,
      idempotencyKey,
    },
  );
};
