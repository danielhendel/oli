// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { z } from "zod";
import {
  rawEventDocSchema,
  type FailureListItemDto,
  labResultDtoSchema,
  createLabResultRequestDtoSchema,
  rawEventsListQuerySchema,
  canonicalEventsListQuerySchema,
  timelineQuerySchema,
  lineageQuerySchema,
  workoutDaySummariesQuerySchema,
  workoutDaySummariesResponseDtoSchema,
  workoutDaySummariesRebuildRequestDtoSchema,
  workoutDaySummariesRebuildResponseDtoSchema,
  workoutDaySummaryItemDtoSchema,
  isAcceptedWorkoutDaySummaryRow,
  workoutMonthSummariesQuerySchema,
  workoutMonthSummariesResponseDtoSchema,
  workoutMonthSummaryItemDtoSchema,
  workoutMonthSummariesRebuildRequestDtoSchema,
  workoutMonthSummariesRebuildResponseDtoSchema,
  workoutMonthSummariesRebuildRangeRequestDtoSchema,
  workoutMonthSummariesRebuildRangeResponseDtoSchema,
  isAcceptedWorkoutMonthSummaryRow,
  countInclusiveCalendarDays,
} from "@oli/contracts";
import {
  nutritionReadProviderForItem,
  resolveNutritionFoodBarcode,
  resolveNutritionFoodDetail,
  resolveNutritionFoodSearch,
} from "../lib/nutritionix/nutritionFoodReadService";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { loadBodyFactsFromRawForApi } from "../lib/bodyFactsSynthesizeFromRaw";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { dayQuerySchema, dayKeySchema } from "../types/day";
import {
  dailyFactsDtoSchema,
  insightDtoSchema,
  insightsResponseDtoSchema,
  intelligenceContextDtoSchema,
  derivedLedgerReplayResponseDtoSchema,
  derivedLedgerRunsResponseDtoSchema,
  derivedLedgerRunSummaryDtoSchema,
  rawEventListItemSchema,
  rawEventsListResponseDtoSchema,
  canonicalEventListItemSchema,
  canonicalEventsListResponseDtoSchema,
  timelineResponseDtoSchema,
  lineageResponseDtoSchema,
  healthScoreDocSchema,
  healthSignalDocSchema,
  sleepViewDtoSchema,
  readinessViewDtoSchema,
  sleepNightViewDtoSchema,
  sleepNightRangeQuerySchema,
  sleepNightRangeResponseDtoSchema,
  SLEEP_NIGHT_RANGE_MAX_DAYS,
  ouraStressRangeQuerySchema,
  ouraStressRangeResponseDtoSchema,
  OURA_STRESS_RANGE_MAX_DAYS,
  ouraDailyStressDayDtoSchema,
  ouraReadinessRangeQuerySchema,
  ouraReadinessRangeResponseDtoSchema,
  OURA_READINESS_RANGE_MAX_DAYS,
  ouraReadinessRangeDayDtoSchema,
  nutritionFoodSearchResponseDtoSchema,
  nutritionFoodDetailResponseDtoSchema,
  type InsightDto,
  type RawEventListItem,
  type OuraDailyStressDayDto,
  type OuraReadinessRangeDayDto,
} from "../types/dtos";

import { db, userCollection, documentIdPath } from "../db";
import { fillSleepContributorsFromStored } from "../lib/ouraVendorSnapshot";
import { loadSleepNightView, loadSleepNightViewsForRange } from "../lib/sleepNightRead";
import {
  isRawEventIngestSuppressionDocId,
  shouldLogSuppressionAuditForId,
} from "../lib/rawEventIngestSuppression";
import { getRawEventsTruthDebugConfig } from "../lib/workoutTruthDebug";
import labsMeRoutes from "./labsMe";

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

/** True when a suppressible Apple Health v2 id is tombstoned for ingest; hide from list/single reads. */
async function rawEventDocHiddenByIngestSuppression(
  uid: string,
  id: string,
  requestId: string,
): Promise<boolean> {
  if (!isRawEventIngestSuppressionDocId(id)) return false;
  try {
    const snap = await userCollection(uid, "rawEventIngestSuppressions").doc(id).get();
    if (snap.exists && shouldLogSuppressionAuditForId(id)) {
      logger.info({
        msg: "raw_event_single_read_suppressed",
        rid: requestId,
        uid,
        rawEventId: id,
      });
    }
    return snap.exists;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      msg: "raw_event_suppression_read_failed_single",
      rid: requestId,
      uid,
      rawEventId: id,
      err: message,
    });
    return false;
  }
}

async function filterOutIngestSuppressedListItems(
  uid: string,
  items: RawEventListItem[],
  requestId: string,
): Promise<RawEventListItem[]> {
  const targets = items.filter((it) => isRawEventIngestSuppressionDocId(it.id));
  if (targets.length === 0) return items;

  const snaps = await Promise.all(
    targets.map(async (it) => {
      try {
        return await userCollection(uid, "rawEventIngestSuppressions").doc(it.id).get();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({
          msg: "raw_event_suppression_read_failed_list",
          rid: requestId,
          uid,
          rawEventId: it.id,
          err: message,
        });
        return null;
      }
    }),
  );
  const suppressed = new Set<string>();
  for (let i = 0; i < targets.length; i++) {
    const s = snaps[i];
    if (s?.exists) suppressed.add(targets[i]!.id);
  }
  for (const id of suppressed) {
    if (shouldLogSuppressionAuditForId(id)) {
      logger.info({
        msg: "raw_events_list_item_filtered_suppressed",
        rid: requestId,
        uid,
        rawEventId: id,
      });
    }
  }
  if (suppressed.size === 0) return items;
  return items.filter((it) => !suppressed.has(it.id));
}

const parseDay = (req: AuthedRequest, res: Response): string | null => {
  const parsed = dayQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_QUERY",
        message: "Invalid query params",
        details: parsed.error.flatten(),
        requestId: getRid(req),
      },
    });
    return null;
  }
  return parsed.data.day;
};

const requireUid = (req: AuthedRequest, res: Response): string | null => {
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId: getRid(req) },
    });
    return null;
  }
  return uid;
};

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  if (fromHeader) return fromHeader;
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  return typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;
};

const invalidDoc500 = (req: AuthedRequest, res: Response, resource: string, details: unknown) => {
  const rid = getRid(req);

  logger.error({
    msg: "invalid_firestore_doc",
    rid,
    resource,
    details,
  });

  res.status(500).json({
    ok: false,
    error: {
      code: "INVALID_DOC",
      message: `Invalid ${resource} document`,
      requestId: rid,
    },
  });
};

// ----------------------------
// Shared helpers
// ----------------------------

type TimestampLike = { toDate: () => Date };

const isTimestampLike = (v: unknown): v is TimestampLike =>
  v != null && typeof v === "object" && typeof (v as TimestampLike).toDate === "function";

const toIsoFromTimestampLike = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (isTimestampLike(v)) return v.toDate().toISOString();
  return null;
};

/** Parse start/end as day or ISO; return ISO bounds. */
function parseStartEndAsIso(
  start: string | undefined,
  end: string | undefined,
): { startIso: string; endIso: string } | null {
  if (!start || !end) return null;
  const startIso = /^\d{4}-\d{2}-\d{2}$/.test(start)
    ? `${start}T00:00:00.000Z`
    : start;
  const endIso = /^\d{4}-\d{2}-\d{2}$/.test(end)
    ? `${end}T23:59:59.999Z`
    : end;
  if (Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso)))
    return null;
  return { startIso, endIso };
}

/** UTC calendar-day walk for workout summary range reads (matches lib enumerateDaysInclusive). */
function enumerateDayKeysInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  let current = start;
  while (current <= end) {
    out.push(current);
    const d = new Date(`${current}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    current = d.toISOString().slice(0, 10);
  }
  return out;
}

/** Encode cursor for pagination: base64(docId) */
function encodeCursor(docId: string): string {
  return Buffer.from(docId, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, "base64url").toString("utf8") || null;
  } catch {
    return null;
  }
}

// ----------------------------
// Day truth
// ----------------------------

const dayTruthDtoSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventsCount: z.number().int().nonnegative(),
  latestCanonicalEventAt: z.string().datetime().nullable(),
});
type DayTruthDto = z.infer<typeof dayTruthDtoSchema>;

router.get(
  "/day-truth",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const snap = await userCollection(uid, "events").where("day", "==", day).get();

    let latest: string | null = null;

    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;

      const updatedAt = typeof raw["updatedAt"] === "string" ? (raw["updatedAt"] as string) : null;
      const createdAt = typeof raw["createdAt"] === "string" ? (raw["createdAt"] as string) : null;

      const candidate = updatedAt ?? createdAt;

      if (candidate && (!latest || candidate > latest)) latest = candidate;
    }

    const out: DayTruthDto = { day, eventsCount: snap.size, latestCanonicalEventAt: latest };

    const validated = dayTruthDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "dayTruth", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// ✅ Phase 1 — Failure Memory
// ----------------------------

const failuresDayQuerySchema = z
  .object({
    day: dayKeySchema,
    limit: z.coerce.number().int().min(1).max(500).default(200),
  })
  .strip();

const failuresRangeQuerySchema = z
  .object({
    start: dayKeySchema,
    end: dayKeySchema,
    limit: z.coerce.number().int().min(1).max(2000).default(500),
  })
  .strip();

function toFailureListItemDto(docId: string, raw: Record<string, unknown>): FailureListItemDto {
  const createdAt = toIsoFromTimestampLike(raw["createdAt"]) ?? new Date(0).toISOString();
  return {
    id: docId,
    type: (raw["source"] as string) ?? "unknown",
    code: (raw["reasonCode"] as string) ?? "UNKNOWN",
    message: (raw["message"] as string) ?? "",
    day: (raw["day"] as string) ?? "",
    createdAt,
    ...(raw["rawEventId"] ? { rawEventId: raw["rawEventId"] as string } : {}),
    ...(raw["details"] && typeof raw["details"] === "object"
      ? { details: raw["details"] as Record<string, unknown> }
      : {}),
  };
}

router.get(
  "/failures",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = failuresDayQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { day, limit } = parsed.data;

    const snap = await userCollection(uid, "failures")
      .where("day", "==", day)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const items: FailureListItemDto[] = snap.docs.map((d) =>
      toFailureListItemDto(d.id, d.data() as Record<string, unknown>),
    );

    res.status(200).json({ items, nextCursor: null });
  }),
);

router.get(
  "/failures/range",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = failuresRangeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end, limit } = parsed.data;

    if (start > end) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "start must be <= end",
          requestId: getRid(req),
        },
      });
      return;
    }

    const snap = await userCollection(uid, "failures")
      .where("day", ">=", start)
      .where("day", "<=", end)
      .orderBy("day", "asc")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    const items: FailureListItemDto[] = snap.docs.map((d) =>
      toFailureListItemDto(d.id, d.data() as Record<string, unknown>),
    );

    res.status(200).json({ items, nextCursor: null });
  }),
);

// ----------------------------
// ✅ Phase 1 — RawEvents Read Boundary
// ----------------------------

const rawEventParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strip();

/**
 * GET /users/me/rawEvents/:id
 *
 * Phase 1 requirement:
 * - User can retrieve/verify any stored RawEvent (memory entry) by id.
 *
 * Properties:
 * - Authenticated
 * - User-scoped read ONLY
 * - Fail-closed contract enforcement via @oli/contracts rawEventDocSchema
 */
// ----------------------------
// ✅ Sprint 2.8 — Uploads Presence (read-only)
// ----------------------------

const uploadsListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strip();

const UPLOADS_LIST_INDEX_ERROR_CODES = ["failed-precondition", "FAILED_PRECONDITION"] as const;

function isFirestoreIndexError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return typeof code === "string" && UPLOADS_LIST_INDEX_ERROR_CODES.includes(code as (typeof UPLOADS_LIST_INDEX_ERROR_CODES)[number]);
}

router.get(
  "/uploads",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const allowedQuery: Record<string, unknown> = {};
    if ("limit" in req.query) allowedQuery.limit = req.query["limit"];
    const parsed = uploadsListQuerySchema.safeParse(allowedQuery);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { limit } = parsed.data;

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await userCollection(uid, "rawEvents")
        .where("kind", "==", "file")
        .where("sourceId", "==", "upload")
        .orderBy("observedAt", "desc")
        .limit(limit)
        .get();
    } catch (err: unknown) {
      if (isFirestoreIndexError(err)) {
        const rid = getRid(req);
        logger.error({
          msg: "uploads_list_firestore_index_missing",
          rid,
          details: err instanceof Error ? err.message : String(err),
        });
        res.status(500).json({
          ok: false,
          error: {
            code: "FIRESTORE_INDEX_MISSING",
            message: "Uploads list query requires a composite index. Add the index and redeploy.",
            requestId: rid,
          },
        });
        return;
      }
      throw err;
    }

    const docs = snap.docs;

    for (const d of docs) {
      const data = d.data();
      const parsedDoc = rawEventDocSchema.safeParse(data);
      if (!parsedDoc.success) {
        invalidDoc500(req, res, "rawEvents", {
          docId: d.id,
          issues: parsedDoc.error.flatten(),
        });
        return;
      }
    }

    const count = docs.length;

    let latest: {
      rawEventId: string;
      observedAt: string;
      receivedAt: string;
      originalFilename?: string;
      mimeType?: string;
    } | null = null;

    if (count > 0) {
      const first = docs[0]!;
      const data = rawEventDocSchema.parse(first.data());
      const payload = data.payload as { originalFilename?: string; mimeType?: string };
      latest = {
        rawEventId: first.id,
        observedAt: data.observedAt,
        receivedAt: data.receivedAt,
        ...(payload.originalFilename ? { originalFilename: payload.originalFilename } : {}),
        ...(payload.mimeType ? { mimeType: payload.mimeType } : {}),
      };
    }

    res.status(200).json({
      ok: true,
      count,
      latest,
    });
  }),
);

router.get(
  "/rawEvents/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedParams = rawEventParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_PARAMS",
          message: "Invalid route params",
          details: parsedParams.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { id } = parsedParams.data;

    const rid = getRid(req);
    if (await rawEventDocHiddenByIngestSuppression(uid, id, rid)) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", resource: "rawEvents", id },
      });
      return;
    }

    const ref = userCollection(uid, "rawEvents").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", resource: "rawEvents", id },
      });
      return;
    }

    const data = snap.data();
    const parsed = rawEventDocSchema.safeParse(data);
    if (!parsed.success) {
      invalidDoc500(req, res, "rawEvents", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

// ----------------------------
// GET /users/me/raw-event?id= — gateway-compatible single RawEvent read (query param)
// Same contract as /rawEvents/:id; use this when calling via API Gateway.
// ----------------------------

const rawEventByIdQuerySchema = z
  .object({
    id: z.string().min(1),
  })
  .strip();

router.get(
  "/raw-event",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = rawEventByIdQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing id",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { id } = parsed.data;

    const rid = getRid(req);
    if (await rawEventDocHiddenByIngestSuppression(uid, id, rid)) {
      res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "RawEvent not found",
          requestId: rid,
        },
      });
      return;
    }

    const ref = userCollection(uid, "rawEvents").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "RawEvent not found",
          requestId: rid,
        },
      });
      return;
    }

    const data = snap.data();
    const docParsed = rawEventDocSchema.safeParse(data);
    if (!docParsed.success) {
      invalidDoc500(req, res, "rawEvents", docParsed.error.flatten());
      return;
    }

    res.status(200).json(docParsed.data);
  }),
);

// ----------------------------
// Sprint 1 — GET /users/me/raw-events (list/query)
// ----------------------------

const RAW_EVENTS_LIST_QUERY_KEYS = [
  "start",
  "end",
  "kinds",
  "kind",
  "provenance",
  "sourceId",
  "uncertaintyState",
  "q",
  "cursor",
  "limit",
  "includePayload",
  "_",
  "key",
] as const;

router.get(
  "/raw-events",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const allowedQuery: Record<string, unknown> = {};
    for (const k of RAW_EVENTS_LIST_QUERY_KEYS) {
      if (k in req.query) allowedQuery[k] = req.query[k];
    }
    const parsed = rawEventsListQuerySchema.safeParse(allowedQuery);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const {
      start,
      end,
      kinds,
      provenance,
      uncertaintyState,
      q: keyword,
      cursor,
      limit,
      includePayload,
    } = parsed.data;

    // Sprint 3 — keyword search: in-memory only (not indexed). Bounded strategy:
    // keyword filters within the date window (start/end). When no date range given,
    // fetches recent events; deterministic and fail-closed.
    const useServerProvenance =
      provenance &&
      provenance.length > 0 &&
      provenance.length <= 30 &&
      !keyword;
    const useServerUncertainty =
      uncertaintyState &&
      uncertaintyState.length > 0 &&
      uncertaintyState.length <= 30 &&
      !keyword;
    const hasPostFilters = !!(provenance?.length || uncertaintyState?.length || keyword);
    const hasInMemoryFilter = keyword || (hasPostFilters && !useServerProvenance && !useServerUncertainty);
    const fetchLimit = hasInMemoryFilter ? Math.min(limit * 5, 200) : limit + 1;

    let q = userCollection(uid, "rawEvents")
      .orderBy("observedAt", "desc")
      .orderBy(documentIdPath, "desc")
      .limit(fetchLimit);

    if (kinds && kinds.length > 0) {
      if (kinds.length === 1) {
        q = q.where("kind", "==", kinds[0]) as ReturnType<typeof q.where>;
      } else {
        q = q.where("kind", "in", kinds.slice(0, 30)) as ReturnType<typeof q.where>;
      }
    }

    if (start && end) {
      const range = parseStartEndAsIso(start, end);
      if (range) {
        q = q
          .where("observedAt", ">=", range.startIso)
          .where("observedAt", "<=", range.endIso) as ReturnType<typeof q.where>;
      }
    }

    if (useServerProvenance) {
      const vals = provenance!.length === 1 ? [provenance[0]] : provenance!.slice(0, 30);
      q = q.where("sourceId", vals.length === 1 ? "==" : "in", vals.length === 1 ? vals[0] : vals) as ReturnType<typeof q.where>;
    }
    if (useServerUncertainty) {
      const vals = uncertaintyState!.length === 1 ? [uncertaintyState[0]] : uncertaintyState!.slice(0, 30);
      q = q.where("uncertaintyState", vals.length === 1 ? "==" : "in", vals.length === 1 ? vals[0] : vals) as ReturnType<typeof q.where>;
    }

    if (cursor) {
      const docId = decodeCursor(cursor);
      if (docId) {
        const docSnap = await userCollection(uid, "rawEvents").doc(docId).get();
        if (docSnap.exists) {
          q = q.startAfter(docSnap) as ReturnType<typeof q.startAfter>;
        }
      }
    }

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await q.get();
    } catch (err: unknown) {
      if (isFirestoreIndexError(err)) {
        const rid = getRid(req);
        logger.error({
          msg: "raw_events_list_firestore_index_missing",
          rid,
          details: err instanceof Error ? err.message : String(err),
        });
        res.status(500).json({
          ok: false,
          error: {
            code: "FIRESTORE_INDEX_MISSING",
            message: "Raw events list query requires a composite index. Add the index and redeploy.",
            requestId: rid,
          },
        });
        return;
      }
      throw err;
    }

    let docs = snap.docs;

    // Deterministic in-memory filters when server-side not used (keyword, or both filters)
    if (provenance && provenance.length > 0 && !useServerProvenance) {
      const set = new Set(provenance);
      docs = docs.filter((d) => {
        const p = (d.data() as Record<string, unknown>).sourceId;
        return typeof p === "string" && set.has(p);
      });
    }
    if (uncertaintyState && uncertaintyState.length > 0 && !useServerUncertainty) {
      const set = new Set(uncertaintyState);
      docs = docs.filter((d) => {
        const u = (d.data() as Record<string, unknown>).uncertaintyState;
        return typeof u === "string" && set.has(u);
      });
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      docs = docs.filter((d) => {
        const raw = d.data() as Record<string, unknown>;
        const id = String(d.id).toLowerCase();
        const payload = raw.payload as Record<string, unknown> | undefined;
        const note = typeof payload?.note === "string" ? payload.note.toLowerCase() : "";
        return id.includes(k) || note.includes(k);
      });
    }
    if (hasPostFilters) {
      docs = docs.slice(0, limit);
    }

    const items: unknown[] = [];
    for (const d of docs) {
      const raw = d.data() as Record<string, unknown>;
      const observedAt =
        typeof raw["observedAt"] === "string"
          ? raw["observedAt"]
          : toIsoFromTimestampLike(raw["observedAt"]);
      const receivedAt =
        typeof raw["receivedAt"] === "string"
          ? raw["receivedAt"]
          : toIsoFromTimestampLike(raw["receivedAt"]);
      if (!observedAt || !receivedAt) {
        invalidDoc500(req, res, "rawEvents", { docId: d.id, reason: "missing timestamps" });
        return;
      }
      const item: Record<string, unknown> = {
        id: d.id,
        userId: raw["userId"],
        sourceId: raw["sourceId"],
        kind: raw["kind"],
        observedAt,
        receivedAt,
        schemaVersion: raw["schemaVersion"],
      };
      if (raw["recordedAt"]) item.recordedAt = typeof raw["recordedAt"] === "string" ? raw["recordedAt"] : toIsoFromTimestampLike(raw["recordedAt"]);
      if (raw["provenance"]) item.provenance = raw["provenance"];
      if (raw["uncertaintyState"]) item.uncertaintyState = raw["uncertaintyState"];
      if (raw["contentUnknown"] === true) item.contentUnknown = true;
      if (raw["correctionOfRawEventId"]) item.correctionOfRawEventId = raw["correctionOfRawEventId"] as string;
      if (includePayload && "payload" in raw) {
        item.payload = raw["payload"];
      }
      const validated = rawEventListItemSchema.safeParse(item);
      if (!validated.success) {
        invalidDoc500(req, res, "rawEvents", {
          docId: d.id,
          issues: validated.error.flatten(),
        });
        return;
      }
      items.push(validated.data);
    }

    const hasMore = hasPostFilters ? false : docs.length > limit;
    let outItems = hasPostFilters ? items : hasMore ? items.slice(0, -1) : items;
    outItems = await filterOutIngestSuppressedListItems(
      uid,
      outItems as RawEventListItem[],
      getRid(req),
    );
    const lastDoc = hasPostFilters ? null : hasMore ? docs[docs.length - 2] : null;
    const nextCursor = lastDoc ? encodeCursor(lastDoc.id) : null;

    const out = { items: outItems, nextCursor };
    const validated = rawEventsListResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "rawEventsListResponse", validated.error.flatten());
      return;
    }

    const truthDbg = getRawEventsTruthDebugConfig();
    if (truthDbg) {
      const rowsForTruth = outItems as RawEventListItem[];
      const kindsForLog = kinds && kinds.length > 0 ? kinds.join(",") : "";
      const rangeParsed = start && end ? parseStartEndAsIso(start, end) : null;
      const observedAts = rowsForTruth
        .map((it) => it.observedAt)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .sort((a, b) => a.localeCompare(b));
      const minObs = observedAts.length > 0 ? observedAts[0]! : null;
      const maxObs = observedAts.length > 0 ? observedAts[observedAts.length - 1]! : null;
      const exactTargetPresence = [...truthDbg.exactIds].map((id) => ({
        id,
        presentInPage: rowsForTruth.some((i) => i.id === id),
      }));
      const prefixTargetMatchesInPage = rowsForTruth
        .filter((i) => truthDbg.prefixes.some((p) => i.id.startsWith(p)))
        .map((i) => ({ id: i.id, observedAt: i.observedAt }));
      logger.info({
        msg: "workout_truth_debug_raw_events_list",
        rid: getRid(req),
        requestStart: start ?? null,
        requestEnd: end ?? null,
        parsedStartIso: rangeParsed?.startIso ?? null,
        parsedEndIso: rangeParsed?.endIso ?? null,
        kinds: kindsForLog,
        limit,
        hasCursor: Boolean(cursor),
        returnedCount: outItems.length,
        minObservedAtInPage: minObs,
        maxObservedAtInPage: maxObs,
        exactTargetPresence,
        prefixTargetMatchesInPage,
      });
    }

    res.status(200).json(validated.data);
  }),
);

const WORKOUT_DAY_SUMMARIES_QUERY_KEYS = ["start", "end", "_", "key"] as const;

// ----------------------------
// GET /users/me/workout-day-summaries?start=&end=
// ----------------------------

router.get(
  "/workout-day-summaries",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const allowedQuery: Record<string, unknown> = {};
    for (const k of WORKOUT_DAY_SUMMARIES_QUERY_KEYS) {
      if (k in req.query) allowedQuery[k] = req.query[k];
    }
    const parsed = workoutDaySummariesQuerySchema.safeParse(allowedQuery);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end } = parsed.data;
    const dayKeys = enumerateDayKeysInclusive(start, end);

    const items: z.infer<typeof workoutDaySummaryItemDtoSchema>[] = [];
    let complete = true;

    for (const day of dayKeys) {
      const snap = await userCollection(uid, "workoutDaySummaries").doc(day).get();
      if (!snap.exists) {
        complete = false;
        continue;
      }
      const data = snap.data();
      if (!data) {
        complete = false;
        continue;
      }
      const row = workoutDaySummaryItemDtoSchema.safeParse(data);
      if (!row.success) {
        complete = false;
        continue;
      }
      const item = row.data;
      if (item.day !== day) {
        complete = false;
        continue;
      }
      if (!isAcceptedWorkoutDaySummaryRow(item)) {
        complete = false;
        continue;
      }
      items.push(item);
    }

    if (items.length !== dayKeys.length) {
      complete = false;
    }

    const out = {
      start,
      end,
      expectedDayCount: dayKeys.length,
      complete,
      items,
    };
    const validated = workoutDaySummariesResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "workoutDaySummariesResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// POST /users/me/workout-day-summaries/rebuild
// Rebuilds summary docs from raw truth (same compute as Cloud Functions). Lazy-requires esbuild bundle.
// Bundle fingerprint: services/api/src/lib/workoutDaySummaryRebuild.bundled.cjs.sha256 (`npm run check:workout-summary-rebuild-bundle`).
// ----------------------------

router.post(
  "/workout-day-summaries/rebuild",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = workoutDaySummariesRebuildRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end } = parsed.data;

    const t0 = Date.now();

    // Built by `node scripts/bundle-workout-day-summary-rebuild.mjs` (see api `build` / `dev` scripts).
    // Lazy require so Jest GET-only tests and `tsc` do not need the artifact on disk.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { rebuildWorkoutDaySummariesForRange } = require("../lib/workoutDaySummaryRebuild.bundled.cjs") as {
      rebuildWorkoutDaySummariesForRange: (args: {
        db: typeof db;
        userId: string;
        start: string;
        end: string;
      }) => Promise<{ daysProcessed: number }>;
    };

    const { daysProcessed } = await rebuildWorkoutDaySummariesForRange({
      db,
      userId: uid,
      start,
      end,
    });

    const out = { start, end, daysProcessed };
    const validated = workoutDaySummariesRebuildResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "workoutDaySummariesRebuildResponse", validated.error.flatten());
      return;
    }

    logger.info({
      msg: "workout_day_summaries_rebuild_complete",
      rid: getRid(req),
      uid,
      start,
      end,
      daysProcessed,
      durationMs: Date.now() - t0,
    });

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// GET /users/me/workout-month-summaries?year=
// ----------------------------

router.get(
  "/workout-month-summaries",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = workoutMonthSummariesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const year = parsed.data.year;
    const expectedMonthKeys: string[] = [];
    for (let m = 1; m <= 12; m += 1) {
      expectedMonthKeys.push(`${year}-${String(m).padStart(2, "0")}`);
    }

    const items: z.infer<typeof workoutMonthSummaryItemDtoSchema>[] = [];
    let complete = true;

    for (const mk of expectedMonthKeys) {
      const snap = await userCollection(uid, "workoutMonthSummaries").doc(mk).get();
      if (!snap.exists) {
        complete = false;
        continue;
      }
      const data = snap.data();
      if (!data) {
        complete = false;
        continue;
      }
      const row = workoutMonthSummaryItemDtoSchema.safeParse(data);
      if (!row.success) {
        complete = false;
        continue;
      }
      const item = row.data;
      if (item.monthKey !== mk) {
        complete = false;
        continue;
      }
      if (!isAcceptedWorkoutMonthSummaryRow(item)) {
        complete = false;
        continue;
      }
      items.push(item);
    }

    if (items.length !== expectedMonthKeys.length) {
      complete = false;
    }

    const out = {
      year,
      expectedMonthCount: expectedMonthKeys.length,
      complete,
      items,
    };
    const validated = workoutMonthSummariesResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "workoutMonthSummariesResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// POST /users/me/workout-month-summaries/rebuild
// ----------------------------

router.post(
  "/workout-month-summaries/rebuild",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = workoutMonthSummariesRebuildRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { year } = parsed.data;
    const t0 = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { recomputeWorkoutMonthSummariesForYear } = require("../lib/workoutDaySummaryRebuild.bundled.cjs") as {
      recomputeWorkoutMonthSummariesForYear: (args: {
        db: typeof db;
        userId: string;
        year: number;
      }) => Promise<{ monthsProcessed: number }>;
    };

    const { monthsProcessed } = await recomputeWorkoutMonthSummariesForYear({
      db,
      userId: uid,
      year,
    });

    const out = { year, monthsProcessed };
    const validated = workoutMonthSummariesRebuildResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "workoutMonthSummariesRebuildResponse", validated.error.flatten());
      return;
    }

    logger.info({
      msg: "workout_month_summaries_rebuild_complete",
      rid: getRid(req),
      uid,
      year,
      monthsProcessed,
      durationMs: Date.now() - t0,
    });

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// POST /users/me/workout-month-summaries/rebuild-range
// ----------------------------

router.post(
  "/workout-month-summaries/rebuild-range",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = workoutMonthSummariesRebuildRangeRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { startMonthKey, endMonthKey } = parsed.data;
    const t0 = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { rebuildWorkoutMonthSummariesForMonthRange } = require("../lib/workoutDaySummaryRebuild.bundled.cjs") as {
      rebuildWorkoutMonthSummariesForMonthRange: (args: {
        db: typeof db;
        userId: string;
        startMonthKey: string;
        endMonthKey: string;
      }) => Promise<{ startMonthKey: string; endMonthKey: string; monthsProcessed: number }>;
    };

    const result = await rebuildWorkoutMonthSummariesForMonthRange({
      db,
      userId: uid,
      startMonthKey,
      endMonthKey,
    });

    const validated = workoutMonthSummariesRebuildRangeResponseDtoSchema.safeParse(result);
    if (!validated.success) {
      invalidDoc500(req, res, "workoutMonthSummariesRebuildRangeResponse", validated.error.flatten());
      return;
    }

    logger.info({
      msg: "workout_month_summaries_rebuild_range_complete",
      rid: getRid(req),
      uid,
      startMonthKey,
      endMonthKey,
      monthsProcessed: result.monthsProcessed,
      durationMs: Date.now() - t0,
    });

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// Sprint 1 — GET /users/me/events (canonical list/query)
// ----------------------------

router.get(
  "/events",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = canonicalEventsListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end, kinds, cursor, limit } = parsed.data;

    let q = userCollection(uid, "events")
      .orderBy("start", "desc")
      .orderBy(documentIdPath, "desc")
      .limit(limit + 1);

    if (kinds && kinds.length > 0) {
      if (kinds.length === 1) {
        q = q.where("kind", "==", kinds[0]) as ReturnType<typeof q.where>;
      } else {
        q = q.where("kind", "in", kinds.slice(0, 30)) as ReturnType<typeof q.where>;
      }
    }

    if (start && end) {
      const range = parseStartEndAsIso(start, end);
      if (range) {
        q = q
          .where("start", ">=", range.startIso)
          .where("start", "<=", range.endIso) as ReturnType<typeof q.where>;
      }
    }

    if (cursor) {
      const docId = decodeCursor(cursor);
      if (docId) {
        const docSnap = await userCollection(uid, "events").doc(docId).get();
        if (docSnap.exists) {
          q = q.startAfter(docSnap) as ReturnType<typeof q.startAfter>;
        }
      }
    }

    let querySnap: FirebaseFirestore.QuerySnapshot;
    try {
      querySnap = await q.get();
    } catch (err: unknown) {
      logger.error({
        msg: "events_list_firestore_query_failed",
        rid: getRid(req),
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(200).json({ items: [], nextCursor: null });
      return;
    }
    const docs = querySnap.docs;

    const items: unknown[] = [];
    for (const d of docs) {
      const raw = d.data() as Record<string, unknown>;
      const startVal =
        typeof raw["start"] === "string" ? raw["start"] : toIsoFromTimestampLike(raw["start"]);
      const endVal =
        typeof raw["end"] === "string" ? raw["end"] : toIsoFromTimestampLike(raw["end"]);
      const createdAt =
        typeof raw["createdAt"] === "string"
          ? raw["createdAt"]
          : toIsoFromTimestampLike(raw["createdAt"]);
      const updatedAt =
        typeof raw["updatedAt"] === "string"
          ? raw["updatedAt"]
          : toIsoFromTimestampLike(raw["updatedAt"]);
      if (!startVal || !endVal || !createdAt || !updatedAt) {
        logger.warn({
          msg: "events_list_skip_doc",
          rid: getRid(req),
          docId: d.id,
          reason: "missing_timestamps",
        });
        continue;
      }
      const item = {
        id: d.id,
        userId: raw["userId"],
        sourceId: raw["sourceId"],
        kind: raw["kind"],
        start: startVal,
        end: endVal,
        day: raw["day"],
        timezone: raw["timezone"],
        createdAt,
        updatedAt,
        schemaVersion: raw["schemaVersion"],
      };
      const validated = canonicalEventListItemSchema.safeParse(item);
      if (!validated.success) {
        logger.warn({
          msg: "events_list_skip_doc",
          rid: getRid(req),
          docId: d.id,
          issues: validated.error.flatten(),
        });
        continue;
      }
      items.push(validated.data);
    }

    const hasMore = docs.length > limit;
    const outItems = hasMore ? items.slice(0, -1) : items;
    const lastDoc = hasMore ? docs[docs.length - 2] : null;
    const nextCursor = lastDoc ? encodeCursor(lastDoc.id) : null;

    const out = { items: outItems, nextCursor };
    const validated = canonicalEventsListResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "canonicalEventsListResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// Sprint 1 — GET /users/me/timeline (days → aggregates)
// ----------------------------

router.get(
  "/timeline",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = timelineQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end } = parsed.data;
    if (start > end) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "start must be <= end",
          requestId: getRid(req),
        },
      });
      return;
    }

    const days: string[] = [];
    for (let d = start; d <= end; ) {
      days.push(d);
      const next = new Date(d + "T12:00:00.000Z");
      next.setUTCDate(next.getUTCDate() + 1);
      d = next.toISOString().slice(0, 10);
    }

    const outDays: unknown[] = [];

    for (const day of days) {
      const dayStart = `${day}T00:00:00.000Z`;
      const dayEnd = `${day}T23:59:59.999Z`;

      const [eventsSnap, rawEventsDaySnap, dailyFactsSnap, insightsSnap, intelSnap, ledgerSnap] = await Promise.all([
        userCollection(uid, "events").where("day", "==", day).get(),
        userCollection(uid, "rawEvents")
          .where("observedAt", ">=", dayStart)
          .where("observedAt", "<=", dayEnd)
          .get(),
        userCollection(uid, "dailyFacts").doc(day).get(),
        userCollection(uid, "insights").where("date", "==", day).get(),
        userCollection(uid, "intelligenceContext").doc(day).get(),
        userCollection(uid, "derivedLedger").doc(day).get(),
      ]);

      const canonicalCount = eventsSnap.size;
      const rawDocs = rawEventsDaySnap.docs;
      const incompleteCount = rawDocs.filter((d) => (d.data() as { kind?: string }).kind === "incomplete").length;
      const hasIncompleteEvents = incompleteCount > 0;

      // Phase 2 — uncertainty rollup (deterministic from raw + canonical)
      const rawData = rawDocs.map((d) => d.data() as { kind?: string; uncertaintyState?: string });
      const uncertaintyStateRollup = {
        hasComplete:
          canonicalCount > 0 ||
          rawData.some((r) => r.uncertaintyState === "complete"),
        hasIncomplete:
          rawData.some((r) => r.kind === "incomplete" || r.uncertaintyState === "incomplete"),
        hasUncertain: rawData.some((r) => r.uncertaintyState === "uncertain"),
      };

      const dailyFactsRaw = dailyFactsSnap.exists ? dailyFactsSnap.data() : undefined;
      const dailyFactsValid = dailyFactsRaw
        ? dailyFactsDtoSchema.safeParse(dailyFactsRaw)
        : null;
      if (dailyFactsRaw && dailyFactsValid && !dailyFactsValid.success) {
        invalidDoc500(req, res, "dailyFacts", { day, issues: dailyFactsValid.error.flatten() });
        return;
      }
      const hasDailyFacts = !!dailyFactsRaw && !!dailyFactsValid?.success;

      const insightsDocs = insightsSnap.docs;
      for (const idoc of insightsDocs) {
        const parsed = insightDtoSchema.safeParse(idoc.data());
        if (!parsed.success) {
          invalidDoc500(req, res, "insights", {
            day,
            docId: idoc.id,
            issues: parsed.error.flatten(),
          });
          return;
        }
      }
      const hasInsights = insightsDocs.length > 0;

      const intelRaw = intelSnap.exists ? intelSnap.data() : undefined;
      const intelValid = intelRaw
        ? intelligenceContextDtoSchema.safeParse(intelRaw)
        : null;
      if (intelRaw && intelValid && !intelValid.success) {
        invalidDoc500(req, res, "intelligenceContext", {
          day,
          issues: intelValid.error.flatten(),
        });
        return;
      }
      const hasIntelligenceContext = !!intelRaw && !!intelValid?.success;

      const hasDerivedLedger = ledgerSnap.exists;

      const dayCompletenessState =
        canonicalCount > 0 && !hasIncompleteEvents
          ? "complete"
          : canonicalCount > 0 && hasIncompleteEvents
            ? "partial"
            : hasIncompleteEvents
              ? "incomplete"
              : "empty";

      // Sprint 3 — deterministic missingReasons (human-readable, server-computed, stable order)
      const missingReasons: string[] = [];
      if (canonicalCount === 0 && !hasIncompleteEvents) missingReasons.push("No events recorded");
      if (hasIncompleteEvents) missingReasons.push("Incomplete events need details");
      if (canonicalCount > 0 && !dailyFactsRaw) missingReasons.push("No daily facts");
      if (canonicalCount > 0 && insightsDocs.length === 0) missingReasons.push("No insights");

      outDays.push({
        day,
        canonicalCount,
        hasDailyFacts,
        hasInsights,
        hasIntelligenceContext,
        hasDerivedLedger,
        incompleteCount,
        hasIncompleteEvents,
        dayCompletenessState,
        uncertaintyStateRollup,
        missingReasons,
      });
    }

    const out = { days: outDays };
    const validated = timelineResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "timelineResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// Sprint 1 — GET /users/me/lineage (raw → canonical → derived)
// ----------------------------

router.get(
  "/lineage",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = lineageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { canonicalEventId, day, kind, observedAt } = parsed.data;

    let canonicalId: string | null = null;
    let rawEventIds: string[] = [];
    let eventDay: string | undefined;

    if (canonicalEventId) {
      const canonSnap = await userCollection(uid, "events").doc(canonicalEventId).get();
      if (!canonSnap.exists) {
        res.status(404).json({
          ok: false,
          error: { code: "NOT_FOUND", resource: "canonicalEvent", id: canonicalEventId },
        });
        return;
      }
      canonicalId = canonicalEventId;
      const canonData = canonSnap.data() as Record<string, unknown>;
      const sourceRawId = canonData["id"] as string | undefined;
      if (sourceRawId) rawEventIds = [sourceRawId];
      eventDay = canonData["day"] as string | undefined;
    } else if (day && kind && observedAt) {
      const canonSnap = await userCollection(uid, "events")
        .where("day", "==", day)
        .where("kind", "==", kind)
        .where("start", "==", observedAt)
        .limit(1)
        .get();
      const doc = canonSnap.docs[0];
      if (!doc) {
        res.status(404).json({
          ok: false,
          error: {
            code: "NOT_FOUND",
            resource: "canonicalEvent",
            message: `No canonical event for day=${day} kind=${kind} observedAt=${observedAt}`,
          },
        });
        return;
      }
      canonicalId = doc.id;
      const canonData = doc.data() as Record<string, unknown>;
      const sourceRawId = canonData["id"] as string | undefined;
      if (sourceRawId) rawEventIds = [sourceRawId];
      eventDay = day;
    } else {
      eventDay = undefined;
    }

    const derivedLedgerRuns: { day: string; runId: string; computedAt: string }[] = [];
    if (eventDay) {
      const ledgerRef = userCollection(uid, "derivedLedger").doc(eventDay);
      const runsSnap = await ledgerRef.collection("runs").orderBy("computedAt", "desc").limit(10).get();
      for (const r of runsSnap.docs) {
        const raw = r.data() as Record<string, unknown>;
        const computedAt =
          typeof raw["computedAt"] === "string"
            ? raw["computedAt"]
            : toIsoFromTimestampLike(raw["createdAt"]);
        if (computedAt) {
          derivedLedgerRuns.push({
            day: eventDay,
            runId: r.id,
            computedAt,
          });
        }
      }
    }

    const out = {
      rawEventIds,
      canonicalEventId: canonicalId,
      derivedLedgerRuns,
    };
    const validated = lineageResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "lineageResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// Sprint 1 — GET /users/me/derived-ledger/snapshot (alias for replay)
// ----------------------------

router.get(
  "/daily-facts",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const ref = userCollection(uid, "dailyFacts").doc(day);

    const snap = await ref.get();
    if (!snap.exists) {
      let synthesizedBody: Awaited<ReturnType<typeof loadBodyFactsFromRawForApi>> | undefined;
      try {
        synthesizedBody = await loadBodyFactsFromRawForApi(uid, day);
      } catch (err) {
        logger.info({
          msg: "daily_facts_synthesize_from_raw_failed",
          level: "warn",
          rid: getRid(req),
          day,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (synthesizedBody) {
        const computedAt = new Date().toISOString();
        const draft = {
          schemaVersion: 1 as const,
          userId: uid,
          date: day,
          computedAt,
          meta: {
            computedAt,
            pipelineVersion: 1,
            source: { synthesizedFromRaw: true as const },
          },
          body: synthesizedBody,
        };
        const synParsed = dailyFactsDtoSchema.safeParse(draft);
        if (synParsed.success) {
          res.status(200).json(synParsed.data);
          return;
        }
      }
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "dailyFacts", day } });
      return;
    }

    const data = snap.data();
    const parsed = dailyFactsDtoSchema.safeParse(data);
    if (!parsed.success) {
      invalidDoc500(req, res, "dailyFacts", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

router.get(
  "/insights",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const snap = await userCollection(uid, "insights").where("date", "==", day).get();

    type Insight = InsightDto;

    const parsedDocs = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const raw = d.data();
      const parsed = insightDtoSchema.safeParse(raw);
      return { docId: d.id, parsed };
    });

    const bad = parsedDocs.find((x) => !x.parsed.success);
    if (bad && !bad.parsed.success) {
      invalidDoc500(req, res, "insights", { docId: bad.docId, issues: bad.parsed.error.flatten() });
      return;
    }

    const items: Insight[] = [];
    for (const doc of parsedDocs) {
      if (doc.parsed.success) items.push(doc.parsed.data);
    }

    const severityRank = (v: "critical" | "warning" | "info"): number => {
      if (v === "critical") return 0;
      if (v === "warning") return 1;
      return 2;
    };

    const sorted = [...items].sort((a: Insight, b: Insight) => {
      const sA = severityRank(a.severity);
      const sB = severityRank(b.severity);
      if (sA !== sB) return sA - sB;

      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.id.localeCompare(b.id);
    });

    const out = { day, count: sorted.length, items: sorted };
    const validated = insightsResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "insightsResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  "/intelligence-context",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const ref = userCollection(uid, "intelligenceContext").doc(day);

    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "intelligenceContext", day } });
      return;
    }

    const data = snap.data();
    const parsed = intelligenceContextDtoSchema.safeParse(data);
    if (!parsed.success) {
      invalidDoc500(req, res, "intelligenceContext", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

// ----------------------------
// Phase 1.5 Sprint 1 — GET /users/me/health-score (derived truth read)
// ----------------------------

router.get(
  "/health-score",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const ref = userCollection(uid, "healthScores").doc(day);
    const snap = await ref.get();

    if (!snap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "healthScore", day } });
      return;
    }

    const data = snap.data();
    const parsed = healthScoreDocSchema.safeParse(data);
    if (!parsed.success) {
      invalidDoc500(req, res, "healthScore", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

// ----------------------------
// Phase 1.5 Sprint 4 — GET /users/me/health-signals (derived truth read)
// ----------------------------

router.get(
  "/health-signals",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const ref = userCollection(uid, "healthSignals").doc(day);
    const snap = await ref.get();

    if (!snap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "healthSignals", day } });
      return;
    }

    const data = snap.data();
    const parsed = healthSignalDocSchema.safeParse(data);
    if (!parsed.success) {
      invalidDoc500(req, res, "healthSignals", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

// ----------------------------
// Oura Tier 1 — GET /users/me/oura-sleep-view & oura-readiness-view (vendor snapshot read + fallback)
// ----------------------------

const OURA_VIEW_FALLBACK_DAYS = 7;

/** Firestore may store Oura sleep score as number or digit string (legacy / import paths). */
function readOuraVendorSleepNumericScoreFromDoc(data: Record<string, unknown> | undefined): number | undefined {
  if (!data) return undefined;
  const read = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "") return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  const primary = read(data.score);
  if (primary != null) return primary;
  const composite = read((data as { composite_score?: unknown }).composite_score);
  return composite ?? undefined;
}

/** Return YYYY-MM-DD for (day - days). */
function dayMinus(day: string, days: number): string {
  const d = new Date(day + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

router.get(
  "/oura-sleep-view",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const requestedDay = parseDay(req, res);
    if (!requestedDay) return;

    let doc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    const exactSnap = await userCollection(uid, "ouraVendorSleep")
      .where("day", "==", requestedDay)
      .limit(1)
      .get();
    doc = exactSnap.docs[0] ?? null;

    if (!doc?.exists) {
      const fallbackStart = dayMinus(requestedDay, OURA_VIEW_FALLBACK_DAYS);
      const fallbackSnap = await userCollection(uid, "ouraVendorSleep")
        .where("day", ">=", fallbackStart)
        .where("day", "<=", requestedDay)
        .orderBy("day", "desc")
        .limit(1)
        .get();
      doc = fallbackSnap.docs[0] ?? null;
    }

    if (!doc?.exists) {
      const lastResortSnap = await userCollection(uid, "ouraVendorSleep")
        .orderBy("day", "desc")
        .limit(1)
        .get();
      doc = lastResortSnap.docs[0] ?? null;
    }

    if (!doc?.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "ouraSleepView", day: requestedDay } });
      return;
    }

    const data = doc.data() as Record<string, unknown> | undefined;
    const resolvedDay =
      typeof data?.day === "string" && data.day.trim().length > 0 ? data.day.trim() : requestedDay;
    const isFallback = resolvedDay !== requestedDay;
    const totalSleepDuration = typeof data?.totalSleepDuration === "number" ? data.totalSleepDuration : undefined;
    const latencyRaw = typeof data?.latency === "number" ? data.latency : undefined;
    const latencyMinutes =
      latencyRaw != null
        ? latencyRaw >= 60
          ? Math.round(latencyRaw / 60)
          : Math.round(latencyRaw)
        : undefined;

    const storedContributors = data?.contributors && typeof data.contributors === "object" ? data.contributors : undefined;
    const storedContributorKeys = storedContributors ? Object.keys(storedContributors) : [];
    const storedData: Parameters<typeof fillSleepContributorsFromStored>[0] = {};
    if (storedContributors) storedData.contributors = storedContributors as Record<string, unknown>;
    if (typeof data?.totalSleepDuration === "number") storedData.totalSleepDuration = data.totalSleepDuration;
    if (typeof data?.efficiency === "number") storedData.efficiency = data.efficiency;
    if (typeof data?.restfulSleep === "number") storedData.restfulSleep = data.restfulSleep;
    if (typeof data?.remSleep === "number") storedData.remSleep = data.remSleep;
    if (typeof data?.deepSleep === "number") storedData.deepSleep = data.deepSleep;
    if (typeof data?.latency === "number") storedData.latency = data.latency;
    const coercedSleepScore = readOuraVendorSleepNumericScoreFromDoc(data);
    if (coercedSleepScore != null) storedData.score = coercedSleepScore;
    const mergedContributors = fillSleepContributorsFromStored(storedData);
    const responseContributorKeys = Object.keys(mergedContributors);
    const responseScore = coercedSleepScore;
    const compositeRaw = (data as { composite_score?: unknown }).composite_score;

    logger.info({
      msg: "oura_sleep_view_proof",
      requestedDay,
      resolvedDay,
      storedContributorKeys,
      responseContributorKeys,
      scoreOnDoc: coercedSleepScore != null,
      scoreOnResponse: responseScore != null,
      compositeScoreOnDoc:
        compositeRaw !== undefined &&
        compositeRaw !== null &&
        compositeRaw !== "" &&
        (typeof compositeRaw === "number" || typeof compositeRaw === "string"),
    });

    const view = {
      requestedDay,
      resolvedDay,
      isFallback,
      day: resolvedDay,
      sourceId: "oura" as const,
      score: responseScore,
      contributors: mergedContributors,
      totalMinutes: totalSleepDuration != null ? Math.round(totalSleepDuration / 60) : undefined,
      efficiency: data?.efficiency as number | undefined,
      latencyMinutes: latencyMinutes ?? undefined,
      awakenings: undefined,
      restfulSleep: data?.restfulSleep as number | undefined,
      remSleep: data?.remSleep as number | undefined,
      deepSleep: data?.deepSleep as number | undefined,
      fetchedAt: data?.fetchedAt as string | undefined,
    };
    const parsed = sleepViewDtoSchema.safeParse(view);
    if (!parsed.success) {
      invalidDoc500(req, res, "ouraSleepView", parsed.error.flatten());
      return;
    }
    res.status(200).json(parsed.data);
  }),
);

router.get(
  "/oura-readiness-view",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const requestedDay = parseDay(req, res);
    if (!requestedDay) return;

    let doc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    const exactSnap = await userCollection(uid, "ouraVendorReadiness")
      .where("day", "==", requestedDay)
      .limit(1)
      .get();
    doc = exactSnap.docs[0] ?? null;

    if (!doc?.exists) {
      const fallbackStart = dayMinus(requestedDay, OURA_VIEW_FALLBACK_DAYS);
      const fallbackSnap = await userCollection(uid, "ouraVendorReadiness")
        .where("day", ">=", fallbackStart)
        .where("day", "<=", requestedDay)
        .orderBy("day", "desc")
        .limit(1)
        .get();
      doc = fallbackSnap.docs[0] ?? null;
    }

    if (!doc?.exists) {
      const lastResortSnap = await userCollection(uid, "ouraVendorReadiness")
        .orderBy("day", "desc")
        .limit(1)
        .get();
      doc = lastResortSnap.docs[0] ?? null;
    }

    if (!doc?.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "ouraReadinessView", day: requestedDay } });
      return;
    }

    const data = doc.data();
    const resolvedDay = typeof data?.day === "string" ? data.day : requestedDay;
    const isFallback = resolvedDay !== requestedDay;
    const view = {
      requestedDay,
      resolvedDay,
      isFallback,
      day: resolvedDay,
      sourceId: "oura" as const,
      score: typeof data?.score === "number" ? data.score : data?.score ?? undefined,
      contributors: data?.contributors,
      fetchedAt: data?.fetchedAt,
    };
    const parsed = readinessViewDtoSchema.safeParse(view);
    if (!parsed.success) {
      invalidDoc500(req, res, "ouraReadinessView", parsed.error.flatten());
      return;
    }
    res.status(200).json(parsed.data);
  }),
);

router.get(
  "/sleep-night",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const requestedDay = parseDay(req, res);
    if (!requestedDay) return;

    logger.info({
      msg: "[SLEEP_NIGHT_ROUTE_VERSION]",
      version: "sleep-night-resolution-v2",
      requestedDay,
      uid,
    });

    const view = await loadSleepNightView(uid, requestedDay);
    if (!view) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "sleepNight", day: requestedDay } });
      return;
    }

    const parsed = sleepNightViewDtoSchema.safeParse(view);
    if (!parsed.success) {
      invalidDoc500(req, res, "sleepNight", parsed.error.flatten());
      return;
    }
    res.status(200).json(parsed.data);
  }),
);

router.get(
  "/sleep-nights",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = sleepNightRangeQuerySchema.safeParse(req.query);
    if (!parsedQ.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsedQ.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end } = parsedQ.data;
    if (start > end) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "start must be <= end",
          requestId: getRid(req),
        },
      });
      return;
    }

    const dayCount = countInclusiveCalendarDays(start, end);
    if (dayCount < 1 || dayCount > SLEEP_NIGHT_RANGE_MAX_DAYS) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: `Inclusive day span must be 1..${SLEEP_NIGHT_RANGE_MAX_DAYS}`,
          requestId: getRid(req),
        },
      });
      return;
    }

    logger.info({
      msg: "[SLEEP_NIGHT_RANGE_ROUTE]",
      version: "sleep-night-range-v1",
      dayCount,
    });

    const nights = await loadSleepNightViewsForRange(uid, start, end);
    const out = {
      start,
      end,
      dayCount,
      resolvedCount: nights.length,
      nights,
    };
    const parsed = sleepNightRangeResponseDtoSchema.safeParse(out);
    if (!parsed.success) {
      invalidDoc500(req, res, "sleepNightRange", parsed.error.flatten());
      return;
    }
    res.status(200).json(parsed.data);
  }),
);

/**
 * GET /users/me/oura-readiness-range?start=&end=
 * Bounded Oura Daily Readiness vendor snapshots — exact provider days only (sparse; no fallback densification / no Oura call).
 */
router.get(
  "/oura-readiness-range",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = ouraReadinessRangeQuerySchema.safeParse(req.query);
    if (!parsedQ.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsedQ.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end } = parsedQ.data;
    if (start > end) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "start must be <= end",
          requestId: getRid(req),
        },
      });
      return;
    }

    const dayCount = countInclusiveCalendarDays(start, end);
    if (dayCount < 1 || dayCount > OURA_READINESS_RANGE_MAX_DAYS) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: `Inclusive day span must be 1..${OURA_READINESS_RANGE_MAX_DAYS}`,
          requestId: getRid(req),
        },
      });
      return;
    }

    logger.info({
      msg: "[OURA_READINESS_RANGE_ROUTE]",
      version: "oura-readiness-range-v1",
      dayCount,
    });

    const snap = await userCollection(uid, "ouraVendorReadiness")
      .where("day", ">=", start)
      .where("day", "<=", end)
      .orderBy("day", "asc")
      .get();

    const byDay = new Map<string, OuraReadinessRangeDayDto>();
    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      const scoreRaw = raw.score;
      const score =
        typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? scoreRaw : null;
      const dtoCandidate = {
        day: raw.day,
        score,
        source: "oura" as const,
      };
      const parsedDay = ouraReadinessRangeDayDtoSchema.safeParse(dtoCandidate);
      if (!parsedDay.success) continue;
      // Exact day only; first ascending wins if duplicates exist.
      if (!byDay.has(parsedDay.data.day)) {
        byDay.set(parsedDay.data.day, parsedDay.data);
      }
    }

    const days = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
    const out = {
      start,
      end,
      dayCount,
      resolvedCount: days.length,
      days,
    };
    const parsed = ouraReadinessRangeResponseDtoSchema.safeParse(out);
    if (!parsed.success) {
      invalidDoc500(req, res, "ouraReadinessRange", parsed.error.flatten());
      return;
    }
    res.status(200).json(parsed.data);
  }),
);

/**
 * GET /users/me/oura-stress?start=&end=
 * Bounded Oura Daily Stress vendor snapshots — exact provider days only (sparse; no fill / no Oura call).
 */
router.get(
  "/oura-stress",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = ouraStressRangeQuerySchema.safeParse(req.query);
    if (!parsedQ.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsedQ.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { start, end } = parsedQ.data;
    if (start > end) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "start must be <= end",
          requestId: getRid(req),
        },
      });
      return;
    }

    const dayCount = countInclusiveCalendarDays(start, end);
    if (dayCount < 1 || dayCount > OURA_STRESS_RANGE_MAX_DAYS) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: `Inclusive day span must be 1..${OURA_STRESS_RANGE_MAX_DAYS}`,
          requestId: getRid(req),
        },
      });
      return;
    }

    logger.info({
      msg: "[OURA_STRESS_RANGE_ROUTE]",
      version: "oura-stress-range-v1",
      dayCount,
    });

    const snap = await userCollection(uid, "ouraVendorStress")
      .where("day", ">=", start)
      .where("day", "<=", end)
      .orderBy("day", "asc")
      .get();

    const byDay = new Map<string, OuraDailyStressDayDto>();
    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      const dtoCandidate = {
        day: raw.day,
        daySummary: raw.daySummary,
        stressHighSeconds: raw.stressHighSeconds,
        recoveryHighSeconds: raw.recoveryHighSeconds,
        source: "oura" as const,
      };
      const parsedDay = ouraDailyStressDayDtoSchema.safeParse(dtoCandidate);
      if (!parsedDay.success) continue;
      // One day → one identity; first ascending wins if duplicates exist.
      if (!byDay.has(parsedDay.data.day)) {
        byDay.set(parsedDay.data.day, parsedDay.data);
      }
    }

    const days = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
    const out = {
      start,
      end,
      dayCount,
      resolvedCount: days.length,
      days,
    };
    const parsed = ouraStressRangeResponseDtoSchema.safeParse(out);
    if (!parsed.success) {
      invalidDoc500(req, res, "ouraStressRange", parsed.error.flatten());
      return;
    }
    res.status(200).json(parsed.data);
  }),
);

// ----------------------------
// ✅ Step 4 — Derived Ledger Replay Reader
// ----------------------------

const replayQuerySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    runId: z.string().min(1).optional(),
    asOf: z.string().datetime().optional(),
  })
  .strip();

router.get(
  "/derived-ledger/runs",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const pointerRef = userCollection(uid, "derivedLedger").doc(day);
    const pointerSnap = await pointerRef.get();

    if (!pointerSnap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "derivedLedgerDay", day } });
      return;
    }

    const pointerRaw = pointerSnap.data() as Record<string, unknown> | undefined;
    const latestRunId =
      typeof pointerRaw?.["latestRunId"] === "string" ? (pointerRaw["latestRunId"] as string) : undefined;

    const runsSnap = await pointerRef.collection("runs").orderBy("computedAt", "desc").limit(50).get();

    const runs = runsSnap.docs.map((d) => {
      const raw = d.data() as Record<string, unknown>;
      const createdAtIso = toIsoFromTimestampLike(raw["createdAt"]) ?? new Date(0).toISOString();
      return { ...raw, createdAt: createdAtIso };
    });

    for (const r of runs) {
      const parsed = derivedLedgerRunSummaryDtoSchema.safeParse(r);
      if (!parsed.success) {
        invalidDoc500(req, res, "derivedLedgerRun", parsed.error.flatten());
        return;
      }
    }

    const out = { day, latestRunId, runs };
    const validated = derivedLedgerRunsResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "derivedLedgerRunsResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  ["/derived-ledger/replay", "/derived-ledger/snapshot"],
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = replayQuerySchema.safeParse(req.query);
    if (!parsedQ.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsedQ.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { day, runId: runIdFromQuery, asOf } = parsedQ.data;

    const pointerRef = userCollection(uid, "derivedLedger").doc(day);
    const pointerSnap = await pointerRef.get();
    if (!pointerSnap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "derivedLedgerDay", day } });
      return;
    }

    const pointerRaw = pointerSnap.data() as Record<string, unknown> | undefined;
    const latestRunId =
      typeof pointerRaw?.["latestRunId"] === "string" ? (pointerRaw["latestRunId"] as string) : undefined;

    let chosenRunId: string | undefined = runIdFromQuery;

    if (!chosenRunId && asOf) {
      const q = await pointerRef
        .collection("runs")
        .where("computedAt", "<=", asOf)
        .orderBy("computedAt", "desc")
        .limit(1)
        .get();

      const doc = q.docs[0];
      if (doc) chosenRunId = doc.id;
    }

    if (!chosenRunId) chosenRunId = latestRunId;

    if (!chosenRunId) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "derivedLedgerRun", day } });
      return;
    }

    const runRef = pointerRef.collection("runs").doc(chosenRunId);
    const runSnap = await runRef.get();

    if (!runSnap.exists) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", resource: "derivedLedgerRun", runId: chosenRunId },
      });
      return;
    }

    const runRaw = runSnap.data() as Record<string, unknown>;
    const runCreatedAt = toIsoFromTimestampLike(runRaw["createdAt"]) ?? new Date(0).toISOString();

    const runNormalized = { ...runRaw, createdAt: runCreatedAt };
    const runParsed = derivedLedgerRunSummaryDtoSchema.safeParse(runNormalized);
    if (!runParsed.success) {
      invalidDoc500(req, res, "derivedLedgerRun", runParsed.error.flatten());
      return;
    }

    const snapsRef = runRef.collection("snapshots");

    const dailyFactsSnap = await snapsRef.doc("dailyFacts").get();
    const intelligenceSnap = await snapsRef.doc("intelligenceContext").get();
    const insightsItemsSnap = await snapsRef.doc("insights").collection("items").get();
    const healthScoreSnap = await snapsRef.doc("healthScore").get();
    const healthSignalsSnap = await snapsRef.doc("healthSignals").get();

    const dailyFacts = dailyFactsSnap.exists
      ? ((dailyFactsSnap.data() as Record<string, unknown>)["data"] as unknown)
      : undefined;

    const intelligenceContext = intelligenceSnap.exists
      ? ((intelligenceSnap.data() as Record<string, unknown>)["data"] as unknown)
      : undefined;

    const insightsItems: unknown[] = insightsItemsSnap.docs.map((d) => {
      const raw = d.data() as Record<string, unknown>;
      return raw["data"];
    });

    if (dailyFacts) {
      const p = dailyFactsDtoSchema.safeParse(dailyFacts);
      if (!p.success) {
        invalidDoc500(req, res, "derivedLedgerSnapshot.dailyFacts", p.error.flatten());
        return;
      }
    }

    if (intelligenceContext) {
      const p = intelligenceContextDtoSchema.safeParse(intelligenceContext);
      if (!p.success) {
        invalidDoc500(req, res, "derivedLedgerSnapshot.intelligenceContext", p.error.flatten());
        return;
      }
    }

    let insightsOut: unknown | undefined = undefined;
    if (insightsItems.length > 0) {
      const out = { day, count: insightsItems.length, items: insightsItems };
      const p = insightsResponseDtoSchema.safeParse(out);
      if (!p.success) {
        invalidDoc500(req, res, "derivedLedgerSnapshot.insights", p.error.flatten());
        return;
      }
      insightsOut = p.data;
    }

    const healthScoreData = healthScoreSnap.exists
      ? ((healthScoreSnap.data() as Record<string, unknown>)["data"] as unknown)
      : undefined;
    const healthSignalsData = healthSignalsSnap.exists
      ? ((healthSignalsSnap.data() as Record<string, unknown>)["data"] as unknown)
      : undefined;

    let healthScoreOut: unknown | undefined = undefined;
    if (healthScoreData) {
      const p = healthScoreDocSchema.safeParse(healthScoreData);
      if (!p.success) {
        invalidDoc500(req, res, "derivedLedgerSnapshot.healthScore", p.error.flatten());
        return;
      }
      healthScoreOut = p.data;
    }

    let healthSignalsOut: unknown | undefined = undefined;
    if (healthSignalsData) {
      const p = healthSignalDocSchema.safeParse(healthSignalsData);
      if (!p.success) {
        invalidDoc500(req, res, "derivedLedgerSnapshot.healthSignals", p.error.flatten());
        return;
      }
      healthSignalsOut = p.data;
    }

    const response = {
      day,
      runId: runParsed.data.runId,
      computedAt: runParsed.data.computedAt,
      pipelineVersion: runParsed.data.pipelineVersion,
      trigger: runParsed.data.trigger,
      ...(runParsed.data.latestCanonicalEventAt ? { latestCanonicalEventAt: runParsed.data.latestCanonicalEventAt } : {}),
      ...(dailyFacts ? { dailyFacts } : {}),
      ...(intelligenceContext ? { intelligenceContext } : {}),
      ...(insightsOut ? { insights: insightsOut } : {}),
      ...(healthScoreOut ? { healthScore: healthScoreOut } : {}),
      ...(healthSignalsOut ? { healthSignals: healthSignalsOut } : {}),
    };

    const validated = derivedLedgerReplayResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "derivedLedgerReplayResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// ✅ Sprint 2.9 — Labs Biomarkers v0 (manual entry)
// ----------------------------

const labResultsListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strip();

const labResultIdParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strip();

/**
 * Canonical content for immutability comparison.
 * Stable stringify of the mutable fields (excludes id, userId, createdAt, updatedAt).
 */
function labResultCanonicalContent(doc: {
  collectedAt: string;
  sourceRawEventId?: string;
  biomarkers: unknown[];
}): string {
  return JSON.stringify({
    collectedAt: doc.collectedAt,
    sourceRawEventId: doc.sourceRawEventId ?? undefined,
    biomarkers: doc.biomarkers,
  });
}

router.post(
  "/labResults",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required for lab result creation",
          requestId: getRid(req),
        },
      });
      return;
    }

    const parsed = createLabResultRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const body = parsed.data;
    const now = new Date().toISOString();

    const labResultsCol = userCollection(uid, "labResults");
    const docRef = labResultsCol.doc(idempotencyKey);

    const doc = {
      schemaVersion: 1 as const,
      id: docRef.id,
      userId: uid,
      collectedAt: body.collectedAt,
      ...(body.sourceRawEventId ? { sourceRawEventId: body.sourceRawEventId } : {}),
      biomarkers: body.biomarkers,
      createdAt: now,
      updatedAt: now,
    };

    const existingSnap = await docRef.get();

    if (existingSnap.exists) {
      const existingData = existingSnap.data() as Record<string, unknown>;
      const incomingContent = {
        collectedAt: body.collectedAt,
        biomarkers: body.biomarkers,
        ...(body.sourceRawEventId ? { sourceRawEventId: body.sourceRawEventId } : {}),
      };
      const existingContent = {
        collectedAt: existingData.collectedAt as string,
        biomarkers: existingData.biomarkers as unknown[],
        ...(existingData.sourceRawEventId ? { sourceRawEventId: existingData.sourceRawEventId as string } : {}),
      };
      const incomingCanonical = labResultCanonicalContent(incomingContent);
      const existingCanonical = labResultCanonicalContent(existingContent);

      if (incomingCanonical === existingCanonical) {
        res.status(202).json({
          ok: true as const,
          id: docRef.id,
          idempotentReplay: true as const,
        });
        return;
      }

      res.status(409).json({
        ok: false as const,
        error: { code: "IMMUTABLE_CONFLICT" as const },
        requestId: getRid(req),
      });
      return;
    }

    await docRef.create(doc);

    res.status(202).json({
      ok: true as const,
      id: docRef.id,
    });
  }),
);

router.get(
  "/labResults",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = labResultsListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { limit } = parsed.data;

    const snap = await userCollection(uid, "labResults")
      .orderBy("collectedAt", "desc")
      .limit(limit)
      .get();

    const items: unknown[] = [];

    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;
      const createdAtIso = toIsoFromTimestampLike(raw["createdAt"]) ?? (raw["createdAt"] as string);
      const updatedAtIso = toIsoFromTimestampLike(raw["updatedAt"]) ?? (raw["updatedAt"] as string);
      const normalized = {
        ...raw,
        id: d.id,
        createdAt: createdAtIso,
        updatedAt: updatedAtIso,
      };

      const validated = labResultDtoSchema.safeParse(normalized);
      if (!validated.success) {
        invalidDoc500(req, res, "labResults", {
          docId: d.id,
          issues: validated.error.flatten(),
        });
        return;
      }
      items.push(validated.data);
    }

    res.status(200).json({
      ok: true as const,
      items,
      nextCursor: null,
    });
  }),
);

router.get(
  "/labResults/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedParams = labResultIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_PARAMS",
          message: "Invalid route params",
          details: parsedParams.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const { id } = parsedParams.data;

    const docRef = userCollection(uid, "labResults").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", resource: "labResults", id },
      });
      return;
    }

    const raw = snap.data() as Record<string, unknown>;
    const createdAtIso = toIsoFromTimestampLike(raw["createdAt"]) ?? (raw["createdAt"] as string);
    const updatedAtIso = toIsoFromTimestampLike(raw["updatedAt"]) ?? (raw["updatedAt"] as string);
    const normalized = {
      ...raw,
      id: snap.id,
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
    };

    const validated = labResultDtoSchema.safeParse(normalized);
    if (!validated.success) {
      invalidDoc500(req, res, "labResults", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

const nutritionFoodSearchQuerySchema = z.object({
  q: z.string().max(160).optional(),
});

const nutritionFoodIdParamsSchema = z.object({
  id: z.string().min(1).max(256),
});

const nutritionBarcodeParamsSchema = z.object({
  barcode: z.string().min(1).max(64),
});

router.get(
  "/nutrition/food-search",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = nutritionFoodSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query params",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const q = parsed.data.q ?? "";
    const resolved = await resolveNutritionFoodSearch(q, { uid });
    if ("ok" in resolved) {
      const configured = resolved.code === "NUTRITIONIX_NOT_CONFIGURED";
      res.status(503).json({
        ok: false,
        error: {
          code: "NUTRITION_PROVIDER_UNAVAILABLE",
          message: configured
            ? "Nutrition food search is not configured for this environment."
            : "Nutrition provider is temporarily unavailable.",
          requestId: getRid(req),
        },
      });
      return;
    }
    const body = {
      schemaVersion: 1 as const,
      provider: resolved.provider,
      items: resolved.items,
    };
    const validated = nutritionFoodSearchResponseDtoSchema.safeParse(body);
    if (!validated.success) {
      res.status(500).json({
        ok: false,
        error: {
          code: "INTERNAL_CONTRACT_MISMATCH",
          message: "Nutrition food search response failed contract validation",
          requestId: getRid(req),
        },
      });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  "/nutrition/food/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedParams = nutritionFoodIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_PARAMS",
          message: "Invalid route params",
          details: parsedParams.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const item = await resolveNutritionFoodDetail(parsedParams.data.id, { uid });
    if (!item) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", resource: "nutritionFood", id: parsedParams.data.id, requestId: getRid(req) },
      });
      return;
    }

    const body = {
      schemaVersion: 1 as const,
      provider: nutritionReadProviderForItem(item),
      ...item,
    };
    const validated = nutritionFoodDetailResponseDtoSchema.safeParse(body);
    if (!validated.success) {
      res.status(500).json({
        ok: false,
        error: {
          code: "INTERNAL_CONTRACT_MISMATCH",
          message: "Nutrition food detail response failed contract validation",
          requestId: getRid(req),
        },
      });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  "/nutrition/food-by-barcode/:barcode",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedParams = nutritionBarcodeParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_PARAMS",
          message: "Invalid route params",
          details: parsedParams.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const item = await resolveNutritionFoodBarcode(parsedParams.data.barcode, { uid });
    if (!item) {
      res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          resource: "nutritionFoodBarcode",
          barcode: parsedParams.data.barcode,
          requestId: getRid(req),
        },
      });
      return;
    }

    const body = {
      schemaVersion: 1 as const,
      provider: nutritionReadProviderForItem(item),
      ...item,
    };
    const validated = nutritionFoodDetailResponseDtoSchema.safeParse(body);
    if (!validated.success) {
      res.status(500).json({
        ok: false,
        error: {
          code: "INTERNAL_CONTRACT_MISMATCH",
          message: "Nutrition food barcode response failed contract validation",
          requestId: getRid(req),
        },
      });
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.use("/labs", labsMeRoutes);

export default router;
