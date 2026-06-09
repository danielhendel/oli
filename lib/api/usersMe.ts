// lib/api/usersMe.ts
import type { ApiResult } from "@/lib/api/http";
import type { PostOptions } from "@/lib/api/http";
import { debugRedactedAuthedUrl } from "@/lib/api/http";
import { apiDeleteJsonAuthed } from "@/lib/api/http";
import { apiPostZodAuthed } from "@/lib/api/validate";
import { apiGetZodAuthed } from "@/lib/api/validate";
import { apiPutZodAuthed } from "@/lib/api/validate";
import { manualWeightIdempotencyKey } from "@/lib/events/manualWeight";
import {
  manualStrengthWorkoutIdempotencyKey,
  type ManualStrengthWorkoutPayload,
} from "@/lib/events/manualStrengthWorkout";
import {
  manualNutritionIdempotencyKey,
  type ManualNutritionPayload,
} from "@/lib/events/manualNutrition";
import { trackedMealNutritionIdempotencyKey } from "@/lib/nutrition/trackedMealNutritionPayload";
import { mealNutritionIdempotencyKey } from "@/lib/nutrition/mealNutritionPayload";
import {
  buildWorkoutTitleOverridePayload,
  workoutTitleOverrideIdempotencyKey,
} from "@/lib/events/workoutTitleOverride";

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
  sleepViewDtoSchema,
  readinessViewDtoSchema,
  sleepNightViewDtoSchema,
  type HealthScoreDoc,
  type HealthSignalDoc,
  type SleepViewDto,
  type ReadinessViewDto,
  type SleepNightViewDto,
  workoutDaySummariesResponseDtoSchema,
  workoutDaySummariesRebuildResponseDtoSchema,
  workoutMonthSummariesResponseDtoSchema,
  workoutMonthSummariesRebuildResponseDtoSchema,
  workoutMonthSummariesRebuildRangeResponseDtoSchema,
  type WorkoutDaySummariesResponseDto,
  type WorkoutDaySummariesRebuildResponseDto,
  type WorkoutMonthSummariesResponseDto,
  type WorkoutMonthSummariesRebuildResponseDto,
  type WorkoutMonthSummariesRebuildRangeResponseDto,
  nutritionFoodSearchResponseDtoSchema,
  nutritionFoodDetailResponseDtoSchema,
  type NutritionFoodSearchResponseDto,
  type NutritionFoodDetailResponseDto,
  nutritionMetaDtoSchema,
  type NutritionMetaDto,
  nutritionPantryListDtoSchema,
  addPantryItemRequestSchema,
  addPantryItemResponseDtoSchema,
  type NutritionPantryListDto,
  type AddPantryItemRequest,
  type AddPantryItemResponseDto,
  nutritionMealListDtoSchema,
  createMealRequestSchema,
  createMealResponseDtoSchema,
  type NutritionMealListDto,
  type CreateMealRequest,
  type CreateMealResponseDto,
  nutritionStoreListDtoSchema,
  type NutritionStoreListDto,
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

export const logNutrition = async (
  payload: ManualNutritionPayload,
  idToken: string,
): Promise<ApiResult<IngestAcceptedResponseDto>> => {
  const ingestBody = {
    provider: "manual" as const,
    kind: "nutrition" as const,
    observedAt: payload.start,
    sourceId: "manual",
    timeZone: payload.timezone,
    payload,
  };

  return apiPostZodAuthed("/ingest", ingestBody, idToken, ingestAcceptedResponseDtoSchema, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: manualNutritionIdempotencyKey(payload),
  });
};

/**
 * Tracked meal (search / barcode) — same POST /ingest nutrition path with meal-scoped idempotency.
 */
export const logTrackedMealNutrition = async (
  payload: ManualNutritionPayload,
  idToken: string,
): Promise<ApiResult<IngestAcceptedResponseDto>> => {
  const ingestBody = {
    provider: "manual" as const,
    kind: "nutrition" as const,
    observedAt: payload.start,
    sourceId: "manual",
    timeZone: payload.timezone,
    payload,
  };

  return apiPostZodAuthed("/ingest", ingestBody, idToken, ingestAcceptedResponseDtoSchema, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: trackedMealNutritionIdempotencyKey(payload),
  });
};

export const searchNutritionFoods = async (
  query: string,
  idToken: string,
): Promise<ApiResult<NutritionFoodSearchResponseDto>> => {
  const q = query.trim();
  const path =
    q.length === 0
      ? "/users/me/nutrition/food-search"
      : `/users/me/nutrition/food-search?q=${encodeURIComponent(q)}`;
  return apiGetZodAuthed(path, idToken, nutritionFoodSearchResponseDtoSchema, {
    noStore: true,
  });
};

export const getNutritionFoodDetail = async (
  foodId: string,
  idToken: string,
): Promise<ApiResult<NutritionFoodDetailResponseDto>> => {
  const id = foodId.trim();
  if (!id) {
    return { ok: false, status: 400, kind: "unknown", error: "foodId is required", requestId: null };
  }
  return apiGetZodAuthed(
    `/users/me/nutrition/food/${encodeURIComponent(id)}`,
    idToken,
    nutritionFoodDetailResponseDtoSchema,
    { noStore: true },
  );
};

export const getNutritionFoodByBarcode = async (
  barcode: string,
  idToken: string,
): Promise<ApiResult<NutritionFoodDetailResponseDto>> => {
  const b = barcode.trim();
  if (!b) {
    return { ok: false, status: 400, kind: "unknown", error: "barcode is required", requestId: null };
  }
  return apiGetZodAuthed(
    `/users/me/nutrition/food-by-barcode/${encodeURIComponent(b)}`,
    idToken,
    nutritionFoodDetailResponseDtoSchema,
    { noStore: true },
  );
};

export const getNutritionMeta = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<NutritionMetaDto>> => {
  return apiGetZodAuthed("/users/me/nutrition-meta", idToken, nutritionMetaDtoSchema, truthGetOpts(opts));
};

export const putNutritionMeta = async (
  body: NutritionMetaDto,
  idToken: string,
): Promise<ApiResult<NutritionMetaDto>> => {
  return apiPutZodAuthed("/users/me/nutrition-meta", body, idToken, nutritionMetaDtoSchema, {
    noStore: true,
  });
};

export const getNutritionPantry = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<NutritionPantryListDto>> => {
  return apiGetZodAuthed("/users/me/nutrition/pantry", idToken, nutritionPantryListDtoSchema, truthGetOpts(opts));
};

export const addNutritionPantryItem = async (
  body: AddPantryItemRequest,
  idToken: string,
  idempotencyKey: string,
): Promise<ApiResult<AddPantryItemResponseDto>> => {
  const parsed = addPantryItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, kind: "unknown", error: "Invalid pantry item", requestId: null };
  }
  return apiPostZodAuthed("/users/me/nutrition/pantry", parsed.data, idToken, addPantryItemResponseDtoSchema, {
    noStore: true,
    idempotencyKey,
  });
};

export const removeNutritionPantryItem = async (
  itemId: string,
  idToken: string,
): Promise<ApiResult<{ ok: true }>> => {
  const id = itemId.trim();
  if (!id) {
    return { ok: false, status: 400, kind: "unknown", error: "itemId is required", requestId: null };
  }
  const res = await apiDeleteJsonAuthed<unknown>(`/users/me/nutrition/pantry/${encodeURIComponent(id)}`, idToken, {
    noStore: true,
  });
  if (!res.ok) return res as ApiResult<{ ok: true }>;
  return { ok: true, status: res.status, requestId: res.requestId, json: { ok: true } };
};

export const getNutritionMeals = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<NutritionMealListDto>> => {
  return apiGetZodAuthed("/users/me/nutrition/meals", idToken, nutritionMealListDtoSchema, truthGetOpts(opts));
};

export const createNutritionMeal = async (
  body: CreateMealRequest,
  idToken: string,
  idempotencyKey: string,
): Promise<ApiResult<CreateMealResponseDto>> => {
  const parsed = createMealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, kind: "unknown", error: "Invalid meal", requestId: null };
  }
  return apiPostZodAuthed("/users/me/nutrition/meals", parsed.data, idToken, createMealResponseDtoSchema, {
    noStore: true,
    idempotencyKey,
  });
};

export const deleteNutritionMeal = async (
  mealId: string,
  idToken: string,
): Promise<ApiResult<{ ok: true }>> => {
  const id = mealId.trim();
  if (!id) {
    return { ok: false, status: 400, kind: "unknown", error: "mealId is required", requestId: null };
  }
  const res = await apiDeleteJsonAuthed<unknown>(`/users/me/nutrition/meals/${encodeURIComponent(id)}`, idToken, {
    noStore: true,
  });
  if (!res.ok) return res as ApiResult<{ ok: true }>;
  return { ok: true, status: res.status, requestId: res.requestId, json: { ok: true } };
};

export const getNutritionStores = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<NutritionStoreListDto>> => {
  return apiGetZodAuthed("/users/me/nutrition/stores", idToken, nutritionStoreListDtoSchema, truthGetOpts(opts));
};

/**
 * Log a saved Meal template as a meal-scoped nutrition RawEvent.
 */
export const logMealNutrition = async (
  payload: ManualNutritionPayload,
  idToken: string,
): Promise<ApiResult<IngestAcceptedResponseDto>> => {
  const ingestBody = {
    provider: "manual" as const,
    kind: "nutrition" as const,
    observedAt: payload.start,
    sourceId: "manual",
    timeZone: payload.timezone,
    payload,
  };

  return apiPostZodAuthed("/ingest", ingestBody, idToken, ingestAcceptedResponseDtoSchema, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey: mealNutritionIdempotencyKey(payload),
  });
};

/** Top-level `observedAt` must parse for @oli/contracts `isoDateTimeStringSchema` (same as payload `appliedAt`). */
function coerceParseableIsoDateTime(value: string, fallbackIso: string): string {
  const t = typeof value === "string" ? value.trim() : "";
  if (t.length > 0 && !Number.isNaN(Date.parse(t))) return t;
  return fallbackIso;
}

/**
 * Append-only durable workout title (POST /ingest). `observedAtIso` should match the target workout
 * anchor so raw-event list windows align with the session calendar day.
 */
export const logWorkoutTitleOverride = async (
  args: {
    targetWorkoutId: string;
    displayName: string;
    observedAtIso: string;
    /** Top-level ingest timeZone (required by gateway). */
    timeZone: string;
    /** Ignored for payload `appliedAt`; server expects save-time ISO from `new Date().toISOString()`. */
    appliedAtIso: string;
    payloadTimeZone?: string;
  },
  idToken: string,
): Promise<ApiResult<IngestAcceptedResponseDto>> => {
  const targetWorkoutId = args.targetWorkoutId.trim();
  if (!targetWorkoutId) {
    return { ok: false, status: 400, kind: "unknown", error: "targetWorkoutId is required", requestId: null };
  }
  const displayName = args.displayName.trim();
  if (!displayName) {
    return { ok: false, status: 400, kind: "unknown", error: "displayName is required", requestId: null };
  }

  const appliedAtIso = new Date().toISOString();
  const observedAtIso = coerceParseableIsoDateTime(args.observedAtIso, appliedAtIso);

  const payload = buildWorkoutTitleOverridePayload({
    targetWorkoutId,
    displayName,
    appliedAtIso,
    ...(typeof args.payloadTimeZone === "string" && args.payloadTimeZone.trim().length > 0
      ? { timeZone: args.payloadTimeZone.trim() }
      : {}),
  });
  const ingestBody = {
    provider: "manual" as const,
    kind: "workout_title_override" as const,
    observedAt: observedAtIso,
    sourceId: "manual",
    timeZone: args.timeZone.trim(),
    payload,
  };

  const idempotencyKey = workoutTitleOverrideIdempotencyKey();

  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // Temporary: trace ingest shape when debugging HTTP 400 (remove once stable).
    // eslint-disable-next-line no-console
    console.log("[workout_title_override] POST /ingest (pre-send)", {
      kind: ingestBody.kind,
      fullPayload: ingestBody,
      targetWorkoutId: payload.targetWorkoutId,
      displayName: payload.displayName,
      appliedAt: payload.appliedAt,
      timeZone: ingestBody.timeZone,
      observedAt: ingestBody.observedAt,
      idempotencyKey,
    });
  }

  return apiPostZodAuthed("/ingest", ingestBody, idToken, ingestAcceptedResponseDtoSchema, {
    timeoutMs: 15000,
    noStore: true,
    idempotencyKey,
  });
};

export const getDailyFacts = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<DailyFactsDto>> => {
  const path = `/users/me/daily-facts?day=${encodeURIComponent(day)}`;
  const res = await apiGetZodAuthed(path, idToken, dailyFactsDtoSchema, truthGetOpts(opts));

  // TEMP DIAGNOSTIC (Weekly Fitness strength=8 audit): prove whether the API itself returns the
  // stale value by logging the raw response truth fields next to the resolved/redacted URL.
  // Compare strength.workoutsCount / computedAt here against the Firestore audit script output.
  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log(
      "[DAILY_FACTS_RESPONSE]",
      JSON.stringify({
        day,
        url: debugRedactedAuthedUrl(path, opts?.cacheBust ? { cacheBust: opts.cacheBust } : undefined),
        status: res.status,
        ok: res.ok,
        strengthWorkoutsCount: res.ok ? (res.json.strength?.workoutsCount ?? null) : null,
        computedAt: res.ok ? (res.json.computedAt ?? null) : null,
        metaComputedAt: res.ok ? (res.json.meta?.computedAt ?? null) : null,
        cacheBust: opts?.cacheBust ?? null,
      }),
    );
  }

  return res;
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

/** GET /users/me/oura-sleep-view?day= — Oura vendor snapshot for Sleep screen (Tier 1). 404 when no snapshot. */
export const getOuraSleepView = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<SleepViewDto>> => {
  return apiGetZodAuthed(
    `/users/me/oura-sleep-view?day=${encodeURIComponent(day)}`,
    idToken,
    sleepViewDtoSchema,
    truthGetOpts(opts),
  );
};

/** GET /users/me/oura-readiness-view?day= — Oura vendor snapshot for Readiness screen (Tier 1). 404 when no snapshot. */
export const getOuraReadinessView = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<ReadinessViewDto>> => {
  return apiGetZodAuthed(
    `/users/me/oura-readiness-view?day=${encodeURIComponent(day)}`,
    idToken,
    readinessViewDtoSchema,
    truthGetOpts(opts),
  );
};

/** GET /users/me/sleep-night?day= — canonical SleepNight for Dash / Sleep (404 when absent). */
export const getSleepNight = async (
  day: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<SleepNightViewDto>> => {
  return apiGetZodAuthed(
    `/users/me/sleep-night?day=${encodeURIComponent(day)}`,
    idToken,
    sleepNightViewDtoSchema,
    truthGetOpts(opts),
  );
};

export const getUploads = async (
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<UploadsPresenceResponseDto>> => {
  return apiGetZodAuthed("/users/me/uploads", idToken, uploadsPresenceResponseDtoSchema, truthGetOpts(opts));
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
    /** Single kind alias (backend supports both `kinds` and `kind`). */
    kind?: string;
    provenance?: string[];
    uncertaintyState?: string[];
    q?: string;
    cursor?: string;
    limit?: number;
    /** When true, list rows include `payload` (avoids per-row GET /raw-event for hydrate paths). */
    includePayload?: boolean;
  } & TruthGetOptions,
): Promise<ApiResult<RawEventsListResponseDto>> => {
  const params = new URLSearchParams();
  if (opts?.start) params.set("start", opts.start);
  if (opts?.end) params.set("end", opts.end);
  if (opts?.kinds?.length) params.set("kinds", opts.kinds.join(","));
  if ((!opts?.kinds || opts.kinds.length === 0) && opts?.kind) params.set("kind", opts.kind);
  if (opts?.provenance?.length) params.set("provenance", opts.provenance.join(","));
  if (opts?.uncertaintyState?.length) params.set("uncertaintyState", opts.uncertaintyState.join(","));
  if (opts?.q) params.set("q", opts.q);
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  if (opts?.includePayload) params.set("includePayload", "true");
  const qs = params.toString();
  const path = `/users/me/raw-events${qs ? `?${qs}` : ""}`;
  const res = await apiGetZodAuthed(path, idToken, rawEventsListResponseDtoSchema, truthGetOpts(opts));

  return res;
};

export const getWorkoutDaySummaries = async (
  idToken: string,
  opts: { start: string; end: string } & TruthGetOptions,
): Promise<ApiResult<WorkoutDaySummariesResponseDto>> => {
  const params = new URLSearchParams();
  params.set("start", opts.start);
  params.set("end", opts.end);
  return apiGetZodAuthed(
    `/users/me/workout-day-summaries?${params.toString()}`,
    idToken,
    workoutDaySummariesResponseDtoSchema,
    truthGetOpts(opts),
  );
};

export const postWorkoutDaySummariesRebuild = async (
  idToken: string,
  opts: { start: string; end: string } & TruthGetOptions,
  postOpts?: PostOptions,
): Promise<ApiResult<WorkoutDaySummariesRebuildResponseDto>> => {
  return apiPostZodAuthed(
    "/users/me/workout-day-summaries/rebuild",
    { start: opts.start, end: opts.end },
    idToken,
    workoutDaySummariesRebuildResponseDtoSchema,
    {
      ...truthGetOpts(opts),
      timeoutMs: 120_000,
      ...postOpts,
    },
  );
};

export const getWorkoutMonthSummaries = async (
  idToken: string,
  opts: { year: number } & TruthGetOptions,
): Promise<ApiResult<WorkoutMonthSummariesResponseDto>> => {
  const params = new URLSearchParams();
  params.set("year", String(opts.year));
  return apiGetZodAuthed(
    `/users/me/workout-month-summaries?${params.toString()}`,
    idToken,
    workoutMonthSummariesResponseDtoSchema,
    truthGetOpts(opts),
  );
};

export const postWorkoutMonthSummariesRebuild = async (
  idToken: string,
  opts: { year: number } & TruthGetOptions,
  postOpts?: PostOptions,
): Promise<ApiResult<WorkoutMonthSummariesRebuildResponseDto>> => {
  return apiPostZodAuthed(
    "/users/me/workout-month-summaries/rebuild",
    { year: opts.year },
    idToken,
    workoutMonthSummariesRebuildResponseDtoSchema,
    {
      ...truthGetOpts(opts),
      timeoutMs: 120_000,
      ...postOpts,
    },
  );
};

export const postWorkoutMonthSummariesRebuildRange = async (
  idToken: string,
  opts: { startMonthKey: string; endMonthKey: string } & TruthGetOptions,
  postOpts?: PostOptions,
): Promise<ApiResult<WorkoutMonthSummariesRebuildRangeResponseDto>> => {
  return apiPostZodAuthed(
    "/users/me/workout-month-summaries/rebuild-range",
    { startMonthKey: opts.startMonthKey, endMonthKey: opts.endMonthKey },
    idToken,
    workoutMonthSummariesRebuildRangeResponseDtoSchema,
    {
      ...truthGetOpts(opts),
      timeoutMs: 120_000,
      ...postOpts,
    },
  );
};

/**
 * GET /users/me/raw-event?id= — single RawEvent (gateway-compatible query param).
 */
export const getRawEvent = async (
  id: string,
  idToken: string,
  opts?: TruthGetOptions,
): Promise<ApiResult<RawEventDoc>> => {
  const params = new URLSearchParams();
  params.set("id", id);
  const res = await apiGetZodAuthed(
    `/users/me/raw-event?${params.toString()}`,
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
