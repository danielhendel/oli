// lib/api/usersMe.ts
import type { ApiResult } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import { apiGetZodAuthed } from "@/lib/api/validate";
import { manualWeightIdempotencyKey } from "@/lib/events/manualWeight";
import {
  manualStrengthWorkoutIdempotencyKey,
  type ManualStrengthWorkoutPayload,
} from "@/lib/events/manualStrengthWorkout";

import {
  logWeightResponseDtoSchema,
  ingestAcceptedResponseDtoSchema,
  dailyFactsDtoSchema,
  insightsResponseDtoSchema,
  intelligenceContextDtoSchema,
  dayTruthDtoSchema,
  labResultsListResponseDtoSchema,
  labResultDtoSchema,
  createLabResultResponseDtoSchema,
  uploadsPresenceResponseDtoSchema,
  type LogWeightRequestDto,
  type LogWeightResponseDto,
  type DailyFactsDto,
  type InsightsResponseDto,
  type IntelligenceContextDto,
  type DayTruthDto,
  type LabResultDto,
  type LabResultsListResponseDto,
  type CreateLabResultRequestDto,
  type CreateLabResultResponseDto,
  type UploadsPresenceResponseDto,
  type IngestAcceptedResponseDto,
} from "@oli/contracts";

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
  // API requires timeZone at top level (see services/api/src/routes/events.ts).
  const ingestBody = {
    provider: "manual",
    kind: "weight",
    observedAt: clean.time,
    sourceId: "manual",
    timeZone: clean.timezone,
    payload: clean,
  };

  // ✅ This must hit POST /ingest (events router is mounted at /ingest and uses router.post("/"))
  return apiPostZodAuthed("/ingest", ingestBody, idToken, logWeightResponseDtoSchema, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: manualWeightIdempotencyKey(clean),
  });
};

export const logStrengthWorkout = async (
  payload: ManualStrengthWorkoutPayload,
  idToken: string,
): Promise<ApiResult<IngestAcceptedResponseDto>> => {
  const ingestBody = {
    provider: "manual",
    kind: "strength_workout",
    observedAt: payload.startedAt,
    sourceId: "manual",
    timeZone: payload.timeZone,
    payload,
  };

  return apiPostZodAuthed("/ingest", ingestBody, idToken, ingestAcceptedResponseDtoSchema, {
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
  return apiGetZodAuthed(
    `/users/me/daily-facts?day=${encodeURIComponent(day)}`,
    idToken,
    dailyFactsDtoSchema,
    truthGetOpts(opts),
  );
};

export const getInsights = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<InsightsResponseDto>> => {
  return apiGetZodAuthed(
    `/users/me/insights?day=${encodeURIComponent(day)}`,
    idToken,
    insightsResponseDtoSchema,
    truthGetOpts(opts),
  );
};

export const getIntelligenceContext = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<IntelligenceContextDto>> => {
  return apiGetZodAuthed(
    `/users/me/intelligence-context?day=${encodeURIComponent(day)}`,
    idToken,
    intelligenceContextDtoSchema,
    truthGetOpts(opts),
  );
};

export const getUploads = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<UploadsPresenceResponseDto>> => {
  return apiGetZodAuthed("/users/me/uploads", idToken, uploadsPresenceResponseDtoSchema, truthGetOpts(opts));
};

/**
 * Truth surface for UI readiness gating.
 */
export const getDayTruth = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DayTruthDto>> => {
  return apiGetZodAuthed(
    `/users/me/day-truth?day=${encodeURIComponent(day)}`,
    idToken,
    dayTruthDtoSchema,
    truthGetOpts(opts),
  );
};

// ----------------------------
// Sprint 2.9 — Labs Biomarkers v0
// ----------------------------

export const getLabResults = async (
  idToken: string,
  opts?: { limit?: number } & TruthGetOptions,
): Promise<ApiResult<LabResultsListResponseDto>> => {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiGetZodAuthed(
    `/users/me/labResults${qs ? `?${qs}` : ""}`,
    idToken,
    labResultsListResponseDtoSchema,
    truthGetOpts(opts),
  );
};

export const getLabResult = async (
  id: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<LabResultDto>> => {
  return apiGetZodAuthed(
    `/users/me/labResults/${encodeURIComponent(id)}`,
    idToken,
    labResultDtoSchema,
    truthGetOpts(opts),
  );
};

export const createLabResult = async (
  payload: CreateLabResultRequestDto,
  idToken: string,
  idempotencyKey: string,
): Promise<ApiResult<CreateLabResultResponseDto>> => {
  return apiPostZodAuthed(
    "/users/me/labResults",
    payload,
    idToken,
    createLabResultResponseDtoSchema,
    {
      timeoutMs: 15000,
      noStore: true,
      idempotencyKey,
    },
  );
};
