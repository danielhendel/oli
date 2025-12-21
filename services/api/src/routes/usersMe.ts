// services/api/src/routes/usersMe.ts
import { Router, type Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

import type { AuthedRequest } from "../middleware/auth";
import { dayQuerySchema } from "../types/day";

type InsightsResponse = {
  /** Echo of the requested day */
  day: string;
  /** Number of insight documents returned */
  count: number;
  /** Raw Insight docs (typed on Functions side; treated as JSON at API boundary) */
  items: Record<string, unknown>[];
};

const router = Router();

const parseDay = (req: AuthedRequest, res: Response): string | null => {
  const parsed = dayQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query params",
      details: parsed.error.flatten(),
    });
    return null;
  }
  return parsed.data.day;
};

const requireUid = (req: AuthedRequest, res: Response): string | null => {
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return uid;
};

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
    return res.status(404).json({ error: "Not found", resource: "dailyFacts", day });
  }

  return res.status(200).json(snap.data());
});

/**
 * GET /users/me/insights?day=YYYY-MM-DD
 * Firestore: /users/{uid}/insights/{insightId} where Insight.date === day
 *
 * Note:
 * - Insights are stored as one doc per insight (id = insight.id), not one doc per day.
 * - This endpoint is intentionally NOT 404 when there are zero insights.
 */
router.get("/insights", async (req: AuthedRequest, res: Response) => {
  const uid = requireUid(req, res);
  if (!uid) return;

  const day = parseDay(req, res);
  if (!day) return;

  const db = getFirestore();
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("insights")
    .where("date", "==", day)
    .get();

  // Deterministic ordering: severity (critical→warning→info), then kind, then id
  const severityRank = (v: unknown): number => {
    if (v === "critical") return 0;
    if (v === "warning") return 1;
    return 2; // info or unknown
  };

  const items = snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .sort((a, b) => {
      const sA = severityRank(a["severity"]);
      const sB = severityRank(b["severity"]);
      if (sA !== sB) return sA - sB;

      const kA = typeof a["kind"] === "string" ? (a["kind"] as string) : "";
      const kB = typeof b["kind"] === "string" ? (b["kind"] as string) : "";
      if (kA !== kB) return kA.localeCompare(kB);

      const idA = typeof a["id"] === "string" ? (a["id"] as string) : "";
      const idB = typeof b["id"] === "string" ? (b["id"] as string) : "";
      return idA.localeCompare(idB);
    });

  const out: InsightsResponse = { day, count: items.length, items };
  return res.status(200).json(out);
});

/**
 * GET /users/me/intelligence-context?day=YYYY-MM-DD
 *
 * Canonical location (repo-truth):
 *   /users/{uid}/intelligenceContext/{YYYY-MM-DD}
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
    return res.status(404).json({ error: "Not found", resource: "intelligenceContext", day });
  }

  return res.status(200).json(snap.data());
});

export default router;
