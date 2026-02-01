// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { z } from "zod";
import { rawEventDocSchema } from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { dayQuerySchema } from "../types/day";
import {
  dailyFactsDtoSchema,
  insightDtoSchema,
  insightsResponseDtoSchema,
  intelligenceContextDtoSchema,
  derivedLedgerReplayResponseDtoSchema,
  derivedLedgerRunsResponseDtoSchema,
  derivedLedgerRunSummaryDtoSchema,
  derivedLedgerExplainResponseDtoSchema,
  canonicalEventDtoSchema,
  type InsightDto,
} from "../types/dtos";

import { userCollection } from "../db";
import { derivedLedgerRunIdExistsForOtherUser } from "../db/derivedLedger";
import usersMeEventsRoutes from "./usersMe.events";
import usersMeSourcesRoutes from "./usersMe.sources";

// ✅ Step 3 — RawEvent Library (Memory Index)
import { decodeCursor, encodeCursor } from "../pagination/cursor";
import { listRawEventsByObservedAtRange } from "../db/rawEvents";
import { rawEventListItemDtoSchema, rawEventsListResponseDtoSchema } from "../types/rawEventListItem.dto";

// ✅ Step 8 — Failure Memory (Read Surface)
import { listFailuresByCreatedAtRange, listFailuresByDay } from "../db/failures";
import { failureListResponseSchema } from "../types/failureEntry.dto";

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

const dayTruthDtoSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventsCount: z.number().int().nonnegative(),
  latestCanonicalEventAt: z.string().datetime().nullable(),
});
type DayTruthDto = z.infer<typeof dayTruthDtoSchema>;

// ----------------------------
// ✅ Step 2 — Canonical Truth Read Surface
// ----------------------------
router.use(usersMeEventsRoutes);

// ----------------------------
// ✅ Step 4 — Source Registry (Trust Boundary)
// Mounted at: /users/me/sources/*
// ----------------------------
router.use("/sources", usersMeSourcesRoutes);

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
// ✅ Step 8 — Failure Memory (Read Surface)
// IMPORTANT: Read-only, fail-closed parsing, cursor pagination.
// ----------------------------

const failuresListQuerySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().min(1).optional(),
  })
  .strict();

const failuresRangeQuerySchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().min(1).optional(),
  })
  .strict();

/**
 * GET /users/me/failures?day=YYYY-MM-DD
 *
 * Longitudinal failure memory list by day.
 * Cursor pagination, deterministic ordering, runtime DTO validation (fail-closed).
 */
router.get(
  "/failures",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = failuresListQuerySchema.safeParse(req.query);
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

    const limit = parsedQ.data.limit ?? 50;

    // Fail-closed cursor decode: db layer throws for invalid cursor.
    let result: Awaited<ReturnType<typeof listFailuresByDay>>;
    try {
      result = await listFailuresByDay({
        uid,
        day: parsedQ.data.day,
        limit,
        ...(parsedQ.data.cursor ? { cursor: parsedQ.data.cursor } : {}),
      });
    } catch {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_CURSOR", message: "Invalid cursor", requestId: getRid(req) },
      });
      return;
    }

    const response = { items: result.items, nextCursor: result.nextCursor };
    const validated = failureListResponseSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "failuresListResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

/**
 * GET /users/me/failures/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Longitudinal failure memory list by day range (inclusive).
 * Cursor pagination, deterministic ordering, runtime DTO validation (fail-closed).
 */
router.get(
  "/failures/range",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = failuresRangeQuerySchema.safeParse(req.query);
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
        error: { code: "INVALID_RANGE", message: "start must be <= end", requestId: getRid(req) },
      });
      return;
    }

    const limit = parsedQ.data.limit ?? 50;

    let result: Awaited<ReturnType<typeof listFailuresByCreatedAtRange>>;
    try {
      result = await listFailuresByCreatedAtRange({
        uid,
        startDay: start,
        endDay: end,
        limit,
        ...(parsedQ.data.cursor ? { cursor: parsedQ.data.cursor } : {}),
      });
    } catch {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_CURSOR", message: "Invalid cursor", requestId: getRid(req) },
      });
      return;
    }

    const response = { items: result.items, nextCursor: result.nextCursor };
    const validated = failureListResponseSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "failuresRangeListResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// ✅ Step 3 — RawEvent Library (Memory Index)
// IMPORTANT: These must be registered BEFORE /rawEvents/:id
// so that "/rawEvents/range" is not captured by the param route.
// ----------------------------

const rawEventsListQuerySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().min(1).optional(),
  })
  .strict();

const rawEventsRangeQuerySchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().min(1).optional(),
  })
  .strict();

const toUtcStartIso = (ymd: string): string => `${ymd}T00:00:00.000Z`;

const addUtcDays = (ymd: string, days: number): string => {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

type RawEventEnvelope = {
  kind?: unknown;
  provider?: unknown;
  sourceId?: unknown;
  sourceType?: unknown;
  observedAt?: unknown;
  receivedAt?: unknown;
  timeZone?: unknown;
  payload?: unknown;
};

function pickUploadSummaryFromPayload(payload: unknown): unknown | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const filename = typeof p["originalFilename"] === "string" ? (p["originalFilename"] as string) : null;
  const mimeType = typeof p["mimeType"] === "string" ? (p["mimeType"] as string) : null;
  const sizeBytes = typeof p["sizeBytes"] === "number" ? (p["sizeBytes"] as number) : null;
  const sha256 = typeof p["sha256"] === "string" ? (p["sha256"] as string) : null;
  const storagePath = typeof p["storagePath"] === "string" ? (p["storagePath"] as string) : null;

  if (!filename || !mimeType || sizeBytes === null || !sha256 || !storagePath) return null;
  return { filename, mimeType, sizeBytes, sha256, storagePath };
}

function mapRawEventDocToListItem(docId: string, data: unknown): unknown {
  const raw = (data ?? {}) as RawEventEnvelope;

  const item: Record<string, unknown> = {
    id: docId,
    kind: raw.kind,
    provider: raw.provider,
    sourceId: raw.sourceId,
    sourceType: raw.sourceType,
    observedAt: raw.observedAt,
    receivedAt: raw.receivedAt,
  };

  if (typeof raw.timeZone === "string") item["timeZone"] = raw.timeZone;

  if (raw.kind === "file") {
    const upload = pickUploadSummaryFromPayload(raw.payload);
    if (upload) item["upload"] = upload;
  }

  return item;
}

function parseCursorOr400(req: AuthedRequest, res: Response, raw?: string) {
  if (!raw) return { ok: true as const, cursor: undefined };

  const decoded = decodeCursor(raw);
  if (!decoded.ok) {
    res.status(400).json({
      ok: false,
      error: { code: "INVALID_CURSOR", message: "Invalid cursor", requestId: getRid(req) },
    });
    return { ok: false as const };
  }
  return { ok: true as const, cursor: decoded.cursor };
}

function sortDeterministically(items: unknown[]): unknown[] {
  return [...items].sort((a, b) => {
    const A = a as { observedAt: string; id: string };
    const B = b as { observedAt: string; id: string };
    if (A.observedAt !== B.observedAt) return A.observedAt.localeCompare(B.observedAt);
    return A.id.localeCompare(B.id);
  });
}

/**
 * GET /users/me/rawEvents?day=YYYY-MM-DD
 *
 * Summary-only RawEvent memory index by day (UTC day boundary).
 * Cursor pagination, deterministic ordering, runtime DTO validation (fail-closed).
 */
router.get(
  "/rawEvents",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = rawEventsListQuerySchema.safeParse(req.query);
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

    const { day, kind, provider, sourceId } = parsedQ.data;
    const limit = parsedQ.data.limit ?? 50;

    const cursorParsed = parseCursorOr400(req, res, parsedQ.data.cursor);
    if (!cursorParsed.ok) return;

    const startIso = toUtcStartIso(day);
    const endIso = toUtcStartIso(addUtcDays(day, 1));

    const baseParams = {
      uid,
      observedAtStartIso: startIso,
      observedAtEndIso: endIso,
      limit,
      filters: {
        ...(kind ? { kind } : {}),
        ...(provider ? { provider } : {}),
        ...(sourceId ? { sourceId } : {}),
      },
    } as const;

    const result = await listRawEventsByObservedAtRange(
      cursorParsed.cursor ? { ...baseParams, cursor: cursorParsed.cursor } : baseParams,
    );

    const mapped = result.docs.map((d) => mapRawEventDocToListItem(d.id, d.data));

    // Fail-closed per-item validation (500)
    for (let i = 0; i < mapped.length; i++) {
      const parsed = rawEventListItemDtoSchema.safeParse(mapped[i]);
      if (!parsed.success) {
        invalidDoc500(req, res, "rawEventListItem", { index: i, issues: parsed.error.flatten() });
        return;
      }

      // Defensive enforcement: if a filter was requested, results must match.
      if (kind && parsed.data.kind !== kind) {
        invalidDoc500(req, res, "rawEvents", { reason: "FILTER_MISMATCH", field: "kind" });
        return;
      }
      if (provider && parsed.data.provider !== provider) {
        invalidDoc500(req, res, "rawEvents", { reason: "FILTER_MISMATCH", field: "provider" });
        return;
      }
      if (sourceId && parsed.data.sourceId !== sourceId) {
        invalidDoc500(req, res, "rawEvents", { reason: "FILTER_MISMATCH", field: "sourceId" });
        return;
      }
    }

    const sorted = sortDeterministically(mapped);

    const nextCursor = result.hasMore
      ? (() => {
          const last = sorted[sorted.length - 1] as { observedAt: string; id: string } | undefined;
          if (!last) return null;
          return encodeCursor({ start: last.observedAt, id: last.id });
        })()
      : null;

    const response = { items: sorted, nextCursor };
    const validated = rawEventsListResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "rawEventsListResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

/**
 * GET /users/me/rawEvents/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Summary-only RawEvent memory index by date range (UTC day boundaries).
 * Cursor pagination, deterministic ordering, runtime DTO validation (fail-closed).
 */
router.get(
  "/rawEvents/range",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = rawEventsRangeQuerySchema.safeParse(req.query);
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

    const { start, end, kind, provider, sourceId } = parsedQ.data;
    if (start > end) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_RANGE", message: "start must be <= end", requestId: getRid(req) },
      });
      return;
    }

    const limit = parsedQ.data.limit ?? 50;

    const cursorParsed = parseCursorOr400(req, res, parsedQ.data.cursor);
    if (!cursorParsed.ok) return;

    const startIso = toUtcStartIso(start);
    const endIso = toUtcStartIso(addUtcDays(end, 1));

    const baseParams = {
      uid,
      observedAtStartIso: startIso,
      observedAtEndIso: endIso,
      limit,
      filters: {
        ...(kind ? { kind } : {}),
        ...(provider ? { provider } : {}),
        ...(sourceId ? { sourceId } : {}),
      },
    } as const;

    const result = await listRawEventsByObservedAtRange(
      cursorParsed.cursor ? { ...baseParams, cursor: cursorParsed.cursor } : baseParams,
    );

    const mapped = result.docs.map((d) => mapRawEventDocToListItem(d.id, d.data));

    // Fail-closed per-item validation (500)
    for (let i = 0; i < mapped.length; i++) {
      const parsed = rawEventListItemDtoSchema.safeParse(mapped[i]);
      if (!parsed.success) {
        invalidDoc500(req, res, "rawEventListItem", { index: i, issues: parsed.error.flatten() });
        return;
      }

      // Defensive enforcement: if a filter was requested, results must match.
      if (kind && parsed.data.kind !== kind) {
        invalidDoc500(req, res, "rawEvents", { reason: "FILTER_MISMATCH", field: "kind" });
        return;
      }
      if (provider && parsed.data.provider !== provider) {
        invalidDoc500(req, res, "rawEvents", { reason: "FILTER_MISMATCH", field: "provider" });
        return;
      }
      if (sourceId && parsed.data.sourceId !== sourceId) {
        invalidDoc500(req, res, "rawEvents", { reason: "FILTER_MISMATCH", field: "sourceId" });
        return;
      }
    }

    const sorted = sortDeterministically(mapped);

    const nextCursor = result.hasMore
      ? (() => {
          const last = sorted[sorted.length - 1] as { observedAt: string; id: string } | undefined;
          if (!last) return null;
          return encodeCursor({ start: last.observedAt, id: last.id });
        })()
      : null;

    const response = { items: sorted, nextCursor };
    const validated = rawEventsListResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "rawEventsListResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

// ----------------------------
// ✅ Phase 1 — RawEvents Read Boundary
// (Registered AFTER the list surfaces to avoid shadowing /rawEvents/range)
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
      const parsed = insightDtoSchema.safeParse(raw); // <-- no cast
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

type TimestampLike = { toDate: () => Date };

const isTimestampLike = (v: unknown): v is TimestampLike => {
  if (!v || typeof v !== "object") return false;
  return typeof (v as TimestampLike).toDate === "function";
};

const toIsoFromTimestampLike = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (isTimestampLike(v)) return v.toDate().toISOString();
  return null;
};

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
  "/derived-ledger/replay",
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
// ✅ Step 6 — Explainable Derived Truth
// GET /users/me/derived-ledger/explain?day=YYYY-MM-DD&runId=RUN_ID
// ----------------------------

const explainQuerySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    runId: z.string().min(1),
  })
  .strip();

// NOTE: We intentionally rely on the shared contract DTO for the response shape.
// We only do lightweight runtime validation of the stored run doc & referenced docs.
const runExplainSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().min(1),
    userId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    affectedDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    computedAt: z.string().min(1),
    pipelineVersion: z.number().int().positive(),
    trigger: z.unknown(),
    latestCanonicalEventAt: z.string().min(1).optional(),
    invariantsApplied: z.array(z.string().min(1)).min(1),
    canonicalEventIds: z.array(z.string().min(1)),
    snapshotRefs: z.array(
      z
        .object({
          kind: z.enum(["dailyFacts", "insights", "intelligenceContext"]),
          doc: z.string().min(1),
          hash: z.string().min(1),
        })
        .strip(),
    ),
    createdAt: z.string().min(1),
  })
  .strip();

const snapshotMetaSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.string().min(1),
    hash: z.string().min(1),
    createdAt: z.unknown(),
    data: z.unknown(),
  })
  .strip();

router.get(
  "/derived-ledger/explain",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = explainQuerySchema.safeParse(req.query);
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

    const { day, runId } = parsedQ.data;

    const pointerRef = userCollection(uid, "derivedLedger").doc(day);
    const pointerSnap = await pointerRef.get();

    if (!pointerSnap.exists) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "derivedLedgerDay", day } });
      return;
    }

    const runRef = pointerRef.collection("runs").doc(runId);
    const runSnap = await runRef.get();

    if (!runSnap.exists) {
      const existsElsewhere = await derivedLedgerRunIdExistsForOtherUser({ uid, runId });
      if (existsElsewhere) {
        res.status(403).json({ ok: false, error: { code: "FORBIDDEN", resource: "derivedLedgerRun", runId } });
        return;
      }

      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "derivedLedgerRun", runId } });
      return;
    }

    // Normalize createdAt to ISO string for contract validation
    const rawRun = runSnap.data() as Record<string, unknown>;
    const createdAtIso = toIsoFromTimestampLike(rawRun["createdAt"]) ?? new Date(0).toISOString();
    const runNormalized = { ...rawRun, createdAt: createdAtIso };

    const runParsed = runExplainSchema.safeParse(runNormalized);
    if (!runParsed.success) {
      invalidDoc500(req, res, "derivedLedgerRunExplain", runParsed.error.flatten());
      return;
    }

    // Defensive invariants (fail-closed)
    if (runParsed.data.userId !== uid) {
      invalidDoc500(req, res, "derivedLedgerRunExplain", { message: "userId mismatch" });
      return;
    }
    if (runParsed.data.date !== day) {
      invalidDoc500(req, res, "derivedLedgerRunExplain", { message: "date mismatch" });
      return;
    }
    if (!runParsed.data.affectedDays.includes(day)) {
      invalidDoc500(req, res, "derivedLedgerRunExplain", { message: "affectedDays missing day" });
      return;
    }

    // Resolve referenced snapshot documents and assert hash matches stored snapshot hash.
    // No payload returned; this is validation only (fail-closed).
    const snapsRoot = runRef.collection("snapshots");

    for (const ref of runParsed.data.snapshotRefs) {
      let snapData: unknown | null = null;

      if (ref.doc === "dailyFacts" || ref.doc === "intelligenceContext") {
        const s = await snapsRoot.doc(ref.doc).get();
        snapData = s.exists ? (s.data() as unknown) : null;
      } else if (ref.doc.startsWith("insights/items/")) {
        const insightId = ref.doc.slice("insights/items/".length);
        if (!insightId) {
          invalidDoc500(req, res, "derivedLedgerSnapshotRef", { message: "empty insightId" });
          return;
        }
        const s = await snapsRoot.doc("insights").collection("items").doc(insightId).get();
        snapData = s.exists ? (s.data() as unknown) : null;
      } else {
        invalidDoc500(req, res, "derivedLedgerSnapshotRef", { message: "unsupported snapshot ref", ref });
        return;
      }

      if (!snapData) {
        invalidDoc500(req, res, "derivedLedgerSnapshot", { message: "missing snapshot doc", ref });
        return;
      }

      const parsedSnap = snapshotMetaSchema.safeParse(snapData);
      if (!parsedSnap.success) {
        invalidDoc500(req, res, "derivedLedgerSnapshot", parsedSnap.error.flatten());
        return;
      }

      if (parsedSnap.data.hash !== ref.hash) {
        invalidDoc500(req, res, "derivedLedgerSnapshot", {
          message: "snapshot hash mismatch",
          expected: ref.hash,
          actual: parsedSnap.data.hash,
          doc: ref.doc,
        });
        return;
      }
    }

    // Resolve referenced canonical event documents and validate shapes/user scope.
    // No payload returned; this is validation only (fail-closed).
    for (const eventId of runParsed.data.canonicalEventIds) {
      const eSnap = await userCollection(uid, "events").doc(eventId).get();
      if (!eSnap.exists) {
        invalidDoc500(req, res, "canonicalEvent", { message: "missing canonical event", eventId });
        return;
      }

      const raw = eSnap.data() as Record<string, unknown>;
      const candidate = { ...raw, id: eventId };
      const parsedEv = canonicalEventDtoSchema.safeParse(candidate);
      if (!parsedEv.success) {
        invalidDoc500(req, res, "canonicalEvent", parsedEv.error.flatten());
        return;
      }

      if (parsedEv.data.userId !== uid) {
        invalidDoc500(req, res, "canonicalEvent", { message: "cross-user canonical event", eventId });
        return;
      }
    }

    const response = { day, run: runParsed.data };

    const validated = derivedLedgerExplainResponseDtoSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "derivedLedgerExplainResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

export default router;
