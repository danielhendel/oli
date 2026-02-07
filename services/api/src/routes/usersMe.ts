// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { z } from "zod";
import { rawEventDocSchema, type FailureListItemDto } from "@oli/contracts";

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
  type InsightDto,
} from "../types/dtos";

import { userCollection } from "../db";

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

export default router;
