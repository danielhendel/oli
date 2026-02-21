// lib/api/usersMe.ts
import type { ApiResult } from "@/lib/api/http";
import type { GetOptions } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import { apiGetZodAuthed } from "@/lib/api/validate";
import { z } from "zod";
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
  canonicalEventsListResponseDtoSchema,
  rawEventsListResponseDtoSchema,
  rawEventDocSchema,
  timelineResponseDtoSchema,
  lineageResponseDtoSchema,
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
  type CanonicalEventsListResponseDto,
  type RawEventsListResponseDto,
  type RawEventDoc,
  type TimelineResponseDto,
  type LineageResponseDto,
  healthScoreDocSchema,
  healthSignalDocSchema,
  type HealthScoreDoc,
  type HealthSignalDoc,
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

/** GET /integrations/withings/status — integration metadata (Phase 3A). No tokens. Phase 3B.1: backfill. */
const withingsBackfillDtoSchema = z
  .object({
    status: z.enum(["idle", "running", "complete", "error"]),
    yearsBack: z.number().optional(),
    chunkDays: z.number().optional(),
    maxChunksPerRun: z.number().optional(),
    cursorStartSec: z.number().optional(),
    cursorEndSec: z.number().optional(),
    processedCount: z.number().optional(),
    lastError: z
      .object({ code: z.string(), message: z.string(), atIso: z.string() })
      .nullable()
      .optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .optional();
const withingsStatusDtoSchema = z.object({
  ok: z.literal(true),
  connected: z.boolean(),
  scopes: z.array(z.string()),
  connectedAt: z.string().nullable(),
  revoked: z.boolean(),
  failureState: z.record(z.unknown()).nullable(),
  backfill: withingsBackfillDtoSchema,
});
export type WithingsStatusDto = z.infer<typeof withingsStatusDtoSchema>;

export const getWithingsStatus = async (
  idToken: string,
  opts?: GetOptions,
): Promise<ApiResult<WithingsStatusDto>> => {
  return apiGetZodAuthed(
    "/integrations/withings/status",
    idToken,
    withingsStatusDtoSchema,
    truthGetOpts(opts),
  );
};

// ----------------------------
// Sprint 1 — Retrieval Surfaces (timeline, events, lineage)
// ----------------------------

export const getTimeline = async (
  start: string,
  end: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<TimelineResponseDto>> => {
  const qs = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  return apiGetZodAuthed(
    `/users/me/timeline?${qs}`,
    idToken,
    timelineResponseDtoSchema,
    truthGetOpts(opts),
  );
};

export const getRawEvents = async (
  idToken: string,
  opts?: {
    start?: string;
    end?: string;
    kinds?: string[];
    provenance?: string[];
    uncertaintyState?: string[];
    q?: string;
    cursor?: string;
    limit?: number;
  } & TruthGetOptions,
): Promise<ApiResult<RawEventsListResponseDto>> => {
  // Fail-closed: only these query keys are allowed by backend rawEventsListQuerySchema (.strict()).
  const {
    start,
    end,
    kinds,
    provenance,
    uncertaintyState,
    q,
    cursor,
    limit,
  } = opts ?? {};
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (kinds?.length) params.set("kinds", kinds.join(","));
  if (provenance?.length) params.set("provenance", provenance.join(","));
  if (uncertaintyState?.length) params.set("uncertaintyState", uncertaintyState.join(","));
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);
  if (typeof limit === "number") params.set("limit", String(limit));
  const qs = params.toString();
  return apiGetZodAuthed(
    `/users/me/raw-events${qs ? `?${qs}` : ""}`,
    idToken,
    rawEventsListResponseDtoSchema,
    truthGetOpts(opts),
  );
};

/**
 * GET /users/me/rawEvents/:id — single RawEvent with full payload (for weight series etc.).
 */
export const getRawEvent = async (
  id: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<RawEventDoc>> => {
  const res = await apiGetZodAuthed(
    `/users/me/raw-events/${encodeURIComponent(id)}`,
    idToken,
    rawEventDocSchema,
    truthGetOpts(opts),
  );
  return res as ApiResult<RawEventDoc>;
};

export const getEvents = async (
  idToken: string,
  opts?: {
    start?: string;
    end?: string;
    kinds?: string[];
    cursor?: string;
    limit?: number;
  } & TruthGetOptions,
): Promise<ApiResult<CanonicalEventsListResponseDto>> => {
  const params = new URLSearchParams();
  if (opts?.start) params.set("start", opts.start);
  if (opts?.end) params.set("end", opts.end);
  if (opts?.kinds?.length) params.set("kinds", opts.kinds.join(","));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiGetZodAuthed(
    `/users/me/events${qs ? `?${qs}` : ""}`,
    idToken,
    canonicalEventsListResponseDtoSchema,
    truthGetOpts(opts),
  );
};

export const getLineage = async (
  idToken: string,
  opts:
    | { canonicalEventId: string }
    | { day: string; kind: string; observedAt: string },
  truthOpts?: TruthGetOptions,
): Promise<ApiResult<LineageResponseDto>> => {
  const params = new URLSearchParams();
  if ("canonicalEventId" in opts) {
    params.set("canonicalEventId", opts.canonicalEventId);
  } else {
    params.set("day", opts.day);
    params.set("kind", opts.kind);
    params.set("observedAt", opts.observedAt);
  }
  const qs = params.toString();
  return apiGetZodAuthed(
    `/users/me/lineage?${qs}`,
    idToken,
    lineageResponseDtoSchema,
    truthGetOpts(truthOpts),
  );
};

/**
 * Phase 1.5 Sprint 2 — Health Score (derived truth, server-computed only).
 * GET /users/me/health-score?day=YYYY-MM-DD
 */
export const getHealthScore = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<HealthScoreDoc>> => {
  return apiGetZodAuthed(
    `/users/me/health-score?day=${encodeURIComponent(day)}`,
    idToken,
    healthScoreDocSchema,
    truthGetOpts(opts),
  );
};

/**
 * Phase 1.5 Sprint 4 — Health Signals (derived truth, server-computed only).
 * GET /users/me/health-signals?day=YYYY-MM-DD
 */
export const getHealthSignals = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<HealthSignalDoc>> => {
  return apiGetZodAuthed(
    `/users/me/health-signals?day=${encodeURIComponent(day)}`,
    idToken,
    healthSignalDocSchema,
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
