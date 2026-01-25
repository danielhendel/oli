// services/functions/src/http/recomputeDailyIntelligenceContextAdminHttp.ts

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import { db } from "../firebaseAdmin";
import type {
  CanonicalEvent,
  DailyFacts,
  Insight,
  IsoDateTimeString,
  YmdDateString,
} from "../types/health";
import { requireAdmin } from "./adminAuth";
import { buildDailyIntelligenceContext } from "../intelligence/buildDailyIntelligenceContext";

// ✅ Data Readiness Contract
import { buildPipelineMeta } from "../pipeline/pipelineMeta";

const isYmd = (value: unknown): value is YmdDateString =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

type Body = {
  userId: string;
  date: YmdDateString;
};

const parseBody = (raw: unknown): Body | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const userId = obj["userId"];
  const date = obj["date"];

  if (!isNonEmptyString(userId)) return null;
  if (!isYmd(date)) return null;

  return { userId, date };
};

/**
 * Admin-only HTTP endpoint
 * Recomputes Daily Intelligence Context for a specific user + date
 * from DailyFacts + Insights.
 *
 * Input:
 *  { "userId": "...", "date": "YYYY-MM-DD" }
 */
export const recomputeDailyIntelligenceContextAdminHttp = onRequest(
  {
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
    invoker: "private",
  },
  async (req, res) => {
    const auth = await requireAdmin(req.header("authorization"));
    if (!auth.ok) {
      res.status(auth.status).json({ ok: false, error: auth.message });
      return;
    }

    const body = parseBody(req.body);
    if (!body) {
      res
        .status(400)
        .json({ ok: false, error: "Invalid body. Expected { userId, date: YYYY-MM-DD }" });
      return;
    }

    const { userId, date } = body;
    const computedAt: IsoDateTimeString = new Date().toISOString();

    try {
      const userRef = db.collection("users").doc(userId);

      // DailyFacts is required input
      const dailyFactsSnap = await userRef.collection("dailyFacts").doc(date).get();
      if (!dailyFactsSnap.exists) {
        res
          .status(404)
          .json({ ok: false, error: `DailyFacts not found for userId=${userId} date=${date}` });
        return;
      }

      const today = dailyFactsSnap.data() as DailyFacts;

      // Insights for the day (optional input)
      const insightsSnap = await userRef.collection("insights").where("date", "==", date).get();
      const insightsForDay = insightsSnap.docs.map((d) => d.data() as Insight);

      // ✅ Truth anchor for readiness: latest canonical event timestamp for the day
      const eventsSnap = await userRef.collection("events").where("day", "==", date).get();
      const eventsForDay = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);

      const latestCanonicalEventAt: IsoDateTimeString =
        eventsForDay.reduce<IsoDateTimeString | null>((max, ev) => {
          const t = ev.updatedAt ?? ev.createdAt;
          if (!t) return max;
          if (!max) return t;
          return t > max ? t : max;
        }, null) ?? computedAt;

      const intelligenceDoc = buildDailyIntelligenceContext({
        userId,
        date,
        computedAt,
        today,
        insightsForDay,
      });

      // ✅ Authoritative recompute: overwrite the doc fully (no merge),
      // so stale fields cannot survive across recomputes.
      const outRef = userRef.collection("intelligenceContext").doc(date);
      await outRef.set({
        ...intelligenceDoc,
        meta: buildPipelineMeta({
          computedAt: latestCanonicalEventAt,
          source: {
            eventsForDay: eventsForDay.length,
            insightsWritten: insightsForDay.length,
          },
        }),
      });

      logger.info("Admin recomputeDailyIntelligenceContext complete", {
        userId,
        date,
        eventsForDay: eventsForDay.length,
        insightsWritten: insightsForDay.length,
      });

      res.status(200).json({
        ok: true,
        written: true,
        userId,
        date,
        path: outRef.path,
        insightsCount: insightsForDay.length,
      });
    } catch (err) {
      logger.error("Admin recomputeDailyIntelligenceContext failed", { userId, date, err });
      res
        .status(500)
        .json({ ok: false, error: "Internal error recomputing Daily Intelligence Context" });
    }
  },
);