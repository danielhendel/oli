// services/api/src/routes/usersMe.events.ts
import { Router, type Response } from "express";
import { z } from "zod";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";

import { canonicalEventDtoSchema, type CanonicalEventDto } from "../types/canonicalEvent.dto";
import { decodeCursor, encodeCursor } from "../pagination/cursor";
import {
  getCanonicalEventById,
  getLatestCanonicalWriteAtForDay,
  listCanonicalEventsByDay,
} from "../db/canonicalEvents";

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

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
      code: "CANONICAL_VALIDATION_FAILED",
      message: `Invalid ${resource} document`,
      requestId: rid,
    },
  });
};

const dayQuerySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .refine((v) => v === undefined || (Number.isFinite(v) && v > 0), { message: "limit must be > 0" })
      .transform((v) => v ?? 25)
      .refine((v) => v <= 100, { message: "limit must be <= 100" }),
    cursor: z.string().optional(),
  })
  .strip();

const idParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strip();

const listResponseSchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    items: z.array(canonicalEventDtoSchema),
    page: z.object({
      limit: z.number().int().positive(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
    meta: z.object({
      requestedDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      latestEventStartAtIncluded: z.string().datetime().nullable(),
      latestCanonicalWriteAtForDay: z.string().datetime().nullable(),
      complete: z.boolean(),
    }),
  })
  .strict();

router.get(
  "/events",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedQ = dayQuerySchema.safeParse(req.query);
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

    const { day, limit, cursor: rawCursor } = parsedQ.data;

    let cursor: { start: string; id: string } | undefined;
    if (rawCursor) {
      const decoded = decodeCursor(rawCursor);
      if (!decoded.ok) {
        res.status(400).json({
          ok: false,
          error: { code: "INVALID_CURSOR", message: "Invalid cursor", requestId: getRid(req) },
        });
        return;
      }
      cursor = decoded.cursor;
    }

    const params = cursor ? { uid, day, limit, cursor } : { uid, day, limit };
    const { docs, hasMore } = await listCanonicalEventsByDay(params);

    // Validate every doc, fail-closed
    const items: CanonicalEventDto[] = [];
    for (const d of docs) {
      const parsed = canonicalEventDtoSchema.safeParse({ ...d.data, id: d.id });
      if (!parsed.success) {
        invalidDoc500(req, res, "canonicalEvent", { docId: d.id, issues: parsed.error.flatten() });
        return;
      }
      items.push(parsed.data);
    }

    // Deterministic next cursor is last item in this page (if hasMore)
    const last = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor = hasMore && last ? encodeCursor({ start: last.start, id: last.id }) : null;

    // Freshness metadata
    let latestStart: string | null = null;
    for (const ev of items) {
        if (!latestStart || ev.start > latestStart) latestStart = ev.start;
    }

    const latestCanonicalWriteAtForDay = await getLatestCanonicalWriteAtForDay({ uid, day });

    const response = {
      day,
      items,
      page: {
        limit,
        hasMore,
        nextCursor,
      },
      meta: {
        requestedDay: day,
        latestEventStartAtIncluded: latestStart,
        latestCanonicalWriteAtForDay,
        complete: !hasMore,
      },
    };

    const validated = listResponseSchema.safeParse(response);
    if (!validated.success) {
      invalidDoc500(req, res, "canonicalEventsListResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

router.get(
  "/events/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedParams = idParamsSchema.safeParse(req.params);
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

    const got = await getCanonicalEventById({ uid, id });

    if (!got.ok) {
      if (got.code === "FORBIDDEN") {
        res.status(403).json({
          ok: false,
          error: { code: "FORBIDDEN", message: "Forbidden", requestId: getRid(req) },
        });
        return;
      }

      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", resource: "canonicalEvent", id },
      });
      return;
    }

    // Merge id from path to ensure deterministic id
    const parsed = canonicalEventDtoSchema.safeParse({ ...(got.data as Record<string, unknown>), id });
    if (!parsed.success) {
      invalidDoc500(req, res, "canonicalEvent", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

export default router;