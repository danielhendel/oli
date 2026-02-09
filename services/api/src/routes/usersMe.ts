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
} from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
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
  type InsightDto,
} from "../types/dtos";

import { userCollection, documentIdPath } from "../db";

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

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

    const parsed = uploadsListQuerySchema.safeParse(req.query);
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
// Sprint 1 — GET /users/me/raw-events (list/query)
// ----------------------------

router.get(
  "/raw-events",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = rawEventsListQuerySchema.safeParse(req.query);
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

    const { start, end, kinds, provenance, uncertaintyState, q: keyword, cursor, limit } = parsed.data;

    // Phase 2 — when provenance/uncertaintyState/keyword filters present, fetch extra then filter (deterministic)
    const hasPostFilters = !!(provenance?.length || uncertaintyState?.length || keyword);
    const fetchLimit = hasPostFilters ? Math.min(limit * 5, 200) : limit + 1;

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

    if (cursor) {
      const docId = decodeCursor(cursor);
      if (docId) {
        const docSnap = await userCollection(uid, "rawEvents").doc(docId).get();
        if (docSnap.exists) {
          q = q.startAfter(docSnap) as ReturnType<typeof q.startAfter>;
        }
      }
    }

    const snap = await q.get();
    let docs = snap.docs;

    // Phase 2 — deterministic in-memory filters (no new Firestore indexes)
    if (provenance && provenance.length > 0) {
      const set = new Set(provenance);
      docs = docs.filter((d) => {
        const p = (d.data() as Record<string, unknown>).provenance;
        return typeof p === "string" && set.has(p);
      });
    }
    if (uncertaintyState && uncertaintyState.length > 0) {
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
    const outItems = hasPostFilters ? items : hasMore ? items.slice(0, -1) : items;
    const lastDoc = hasPostFilters ? null : hasMore ? docs[docs.length - 2] : null;
    const nextCursor = lastDoc ? encodeCursor(lastDoc.id) : null;

    const out = { items: outItems, nextCursor };
    const validated = rawEventsListResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "rawEventsListResponse", validated.error.flatten());
      return;
    }

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

    const snap = await q.get();
    const docs = snap.docs;

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
        invalidDoc500(req, res, "events", { docId: d.id, reason: "missing timestamps" });
        return;
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
        invalidDoc500(req, res, "events", {
          docId: d.id,
          issues: validated.error.flatten(),
        });
        return;
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

export default router;
