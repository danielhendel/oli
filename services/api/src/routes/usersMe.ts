// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

import type { AuthedRequest } from "../middleware/auth";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { dayQuerySchema } from "../types/day";
import {
  dailyFactsDtoSchema,
  insightDtoSchema,
  insightsResponseDtoSchema,
  intelligenceContextDtoSchema,
  logWeightRequestDtoSchema,
  logWeightResponseDtoSchema,
} from "../types/dtos";

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

/**
 * POST /users/me/body/weight
 *
 * Body MUST match ManualWeightPayload expected by functions:
 * { time, day, timezone, weightKg, bodyFatPercent? }
 *
 * Writes RawEvent matching services/functions/src/validation/rawEvent.ts
 * into: /users/{uid}/rawEvents/{rawEventId}
 */
router.post("/body/weight", async (req: AuthedRequest, res: Response) => {
  const uid = requireUid(req, res);
  if (!uid) return;

  const parsed = logWeightRequestDtoSchema.safeParse(req.body);
  if (!parsed.success) {
    return invalidBody400(req, res, parsed.error.flatten());
  }

  const payload = parsed.data;

  // Validate ISO date string parse (defensive)
  if (Number.isNaN(Date.parse(payload.time))) {
    return invalidBody400(req, res, { time: "Invalid ISO datetime string" });
  }

  const rawEventId = randomUUID();
  const nowIso = new Date().toISOString();

  // ✅ MUST match parseRawEvent required keys:
  // requiredStringKeys: id,userId,sourceId,provider,receivedAt,observedAt
  // sourceType must be valid HealthSourceType (manual)
  // kind must be CanonicalEventKind (weight)
  // schemaVersion === 1
  // payload must exist
  const rawEvent = {
    schemaVersion: 1 as const,
    id: rawEventId,
    userId: uid,
    sourceId: "manual",
    provider: "manual",
    sourceType: "manual",
    kind: "weight",
    receivedAt: nowIso,
    observedAt: payload.time,
    payload: {
      time: payload.time,
      day: payload.day,
      timezone: payload.timezone,
      weightKg: payload.weightKg,
      ...(payload.bodyFatPercent !== undefined ? { bodyFatPercent: payload.bodyFatPercent } : {}),
    },
  };

  const db = getFirestore();
  await db.collection("users").doc(uid).collection("rawEvents").doc(rawEventId).set(rawEvent, { merge: false });

  const out = { ok: true as const, rawEventId, day: payload.day };
  const validated = logWeightResponseDtoSchema.safeParse(out);
  if (!validated.success) {
    return invalidDoc500(req, res, "logWeightResponse", validated.error.flatten());
  }

  return res.status(200).json(validated.data);
});

/**
 * GET /users/me/daily-facts?day=YYYY-MM-DD
 * Firestore: /users/{uid}/dailyFacts/{day}
 */
router.get("/daily-facts", async (req: AuthedRequest, res: Response) => {
  const uid = requireUid(req, res);
  if (!uid) return;

  const day = parseDay(req, res);
  if (!day) return;

  const db = getFirestore();
  const ref = db.collection("users").doc(uid).collection("dailyFacts").doc(day);

  const snap = await ref.get();
  if (!snap.exists) {
    return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "dailyFacts", day } });
  }

  const data = snap.data();
  const parsed = dailyFactsDtoSchema.safeParse(data);
  if (!parsed.success) {
    return invalidDoc500(req, res, "dailyFacts", parsed.error.flatten());
  }

  return res.status(200).json(parsed.data);
});

/**
 * GET /users/me/insights?day=YYYY-MM-DD
 * Firestore: /users/{uid}/insights/{insightId} where Insight.date === day
 *
 * Not 404 when zero insights.
 */
router.get("/insights", async (req: AuthedRequest, res: Response) => {
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
    return invalidDoc500(req, res, "insights", { docId: bad.docId, issues: bad.parsed.error.flatten() });
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
    return invalidDoc500(req, res, "insightsResponse", validated.error.flatten());
  }

  return res.status(200).json(validated.data);
});

/**
 * GET /users/me/intelligence-context?day=YYYY-MM-DD
 * Firestore: /users/{uid}/intelligenceContext/{YYYY-MM-DD}
 */
router.get("/intelligence-context", async (req: AuthedRequest, res: Response) => {
  const uid = requireUid(req, res);
  if (!uid) return;

  const day = parseDay(req, res);
  if (!day) return;

  const db = getFirestore();
  const ref = db.collection("users").doc(uid).collection("intelligenceContext").doc(day);

  const snap = await ref.get();
  if (!snap.exists) {
    return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "intelligenceContext", day } });
  }

  const data = snap.data();
  const parsed = intelligenceContextDtoSchema.safeParse(data);
  if (!parsed.success) {
    return invalidDoc500(req, res, "intelligenceContext", parsed.error.flatten());
  }

  return res.status(200).json(parsed.data);
});

export default router;
