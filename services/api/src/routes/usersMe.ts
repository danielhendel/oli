// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { z } from "zod";

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
    type Parsed =
      | { success: true; data: Insight }
      | { success: false; error: z.ZodError };

    type InsightParsedDoc = {
      docId: string;
      parsed: Parsed;
    };

    const parsedDocs: InsightParsedDoc[] = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const raw = d.data();
      const parsed = insightDtoSchema.safeParse(raw) as Parsed;
      return { docId: d.id, parsed };
    });

    const bad = parsedDocs.find((x: InsightParsedDoc) => !x.parsed.success);
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

export default router;
