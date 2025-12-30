// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { z } from "zod";

import type { AuthedRequest } from "../middleware/auth";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { ymdInTimeZoneFromIso } from "../lib/dayKey";
import { dayQuerySchema } from "../types/day";
import {
  dailyFactsDtoSchema,
  insightDtoSchema,
  insightsResponseDtoSchema,
  intelligenceContextDtoSchema,
  logWeightRequestDtoSchema,
  logWeightResponseDtoSchema,
} from "../types/dtos";

import { asyncHandler } from "../lib/asyncHandler";

// ✅ Authoritative contract
import { rawEventDocSchema } from "../../../../lib/contracts";

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const key = req.header("Idempotency-Key") ?? req.header("X-Idempotency-Key") ?? undefined;
  if (!key) return undefined;
  if (key.includes("/")) return undefined;
  return key;
};

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

const invalidBody400 = (req: AuthedRequest, res: Response, details: unknown) => {
  res.status(400).json({
    ok: false,
    error: {
      code: "INVALID_BODY",
      message: "Invalid request body",
      details,
      requestId: getRid(req),
    },
  });
};

// ✅ Minimal DTO for day-truth response (kept local to avoid coupling)
const dayTruthDtoSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventsCount: z.number().int().nonnegative(),
  latestCanonicalEventAt: z.string().datetime().nullable(),
});
type DayTruthDto = z.infer<typeof dayTruthDtoSchema>;

/**
 * POST /users/me/body/weight
 */
router.post(
  "/body/weight",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = logWeightRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      invalidBody400(req, res, parsed.error.flatten());
      return;
    }

    const payload = parsed.data;

    if (Number.isNaN(Date.parse(payload.time))) {
      invalidBody400(req, res, { time: "Invalid ISO datetime string" });
      return;
    }

    const day = ymdInTimeZoneFromIso(payload.time, payload.timezone);

    const db = getFirestore();
    const rawEventsCol = db.collection("users").doc(uid).collection("rawEvents");

    const idempotencyKey = getIdempotencyKey(req);
    const docRef = idempotencyKey ? rawEventsCol.doc(idempotencyKey) : rawEventsCol.doc(randomUUID());
    const rawEventId = docRef.id;

    const nowIso = new Date().toISOString();

    const rawEvent = {
      schemaVersion: 1 as const,
      id: rawEventId,
      userId: uid,
      sourceId: "manual",
      provider: "manual",
      sourceType: "manual",
      kind: "weight" as const,
      receivedAt: nowIso,
      observedAt: payload.time,
      payload: {
        time: payload.time,
        day,
        timezone: payload.timezone,
        weightKg: payload.weightKg,
        ...(payload.bodyFatPercent !== undefined ? { bodyFatPercent: payload.bodyFatPercent } : {}),
      },
    };

    const rawValidated = rawEventDocSchema.safeParse(rawEvent);
    if (!rawValidated.success) {
      invalidDoc500(req, res, "rawEvent", rawValidated.error.flatten());
      return;
    }

    try {
      await docRef.create(rawValidated.data);
    } catch (e: unknown) {
      const snap = await docRef.get();
      if (snap.exists) {
        const out = { ok: true as const, rawEventId, day };
        const validated = logWeightResponseDtoSchema.safeParse(out);
        if (!validated.success) {
          invalidDoc500(req, res, "logWeightResponse", validated.error.flatten());
          return;
        }
        res.status(200).json(validated.data);
        return;
      }
      throw e;
    }

    const out = { ok: true as const, rawEventId, day };
    const validated = logWeightResponseDtoSchema.safeParse(out);
    if (!validated.success) {
      invalidDoc500(req, res, "logWeightResponse", validated.error.flatten());
      return;
    }

    res.status(200).json(validated.data);
  }),
);

/**
 * GET /users/me/day-truth?day=YYYY-MM-DD
 *
 * Truth anchor for UI readiness gating.
 * Reads canonical events for the day and returns:
 * - eventsCount
 * - latestCanonicalEventAt (max(updatedAt ?? createdAt))
 */
router.get(
  "/day-truth",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const db = getFirestore();

    // Canonical events live here (repo-truth): users/{uid}/events
    const snap = await db.collection("users").doc(uid).collection("events").where("day", "==", day).get();

    let latest: string | null = null;

    for (const d of snap.docs) {
      const raw = d.data() as Record<string, unknown>;

      const updatedAt = typeof raw["updatedAt"] === "string" ? (raw["updatedAt"] as string) : null;
      const createdAt = typeof raw["createdAt"] === "string" ? (raw["createdAt"] as string) : null;

      const candidate = updatedAt ?? createdAt;

      // ISO strings compare lexicographically for ordering
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

/**
 * GET /users/me/daily-facts?day=YYYY-MM-DD
 */
router.get(
  "/daily-facts",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const db = getFirestore();
    const ref = db.collection("users").doc(uid).collection("dailyFacts").doc(day);

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

/**
 * GET /users/me/insights?day=YYYY-MM-DD
 */
router.get(
  "/insights",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const db = getFirestore();
    const snap = await db.collection("users").doc(uid).collection("insights").where("date", "==", day).get();

    const parsedDocs = snap.docs.map((d) => {
      const raw = d.data();
      const parsed = insightDtoSchema.safeParse(raw);
      return { docId: d.id, parsed };
    });

    const bad = parsedDocs.find((x) => !x.parsed.success);
    if (bad && !bad.parsed.success) {
      invalidDoc500(req, res, "insights", { docId: bad.docId, issues: bad.parsed.error.flatten() });
      return;
    }

    const items = parsedDocs.map((x) => x.parsed.data);

    const severityRank = (v: "critical" | "warning" | "info"): number => {
      if (v === "critical") return 0;
      if (v === "warning") return 1;
      return 2;
    };

    const sorted = [...items].sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

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

/**
 * GET /users/me/intelligence-context?day=YYYY-MM-DD
 */
router.get(
  "/intelligence-context",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const day = parseDay(req, res);
    if (!day) return;

    const db = getFirestore();
    const ref = db.collection("users").doc(uid).collection("intelligenceContext").doc(day);

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

export default router;
