// services/functions/src/realtime/onCanonicalEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, DailyFacts, IsoDateTimeString, YmdDateString } from "../types/health";
import { aggregateDailyFactsForDay } from "../dailyFacts/aggregateDailyFacts";
import { enrichDailyFactsWithBaselinesAndAverages } from "../dailyFacts/enrichDailyFacts";
import { generateInsightsForDailyFacts } from "../insights/rules";
import { buildDailyIntelligenceContextDoc } from "../intelligence/buildDailyIntelligenceContext";

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year.toString().padStart(4, "0")}-${month}-${day}`;
};

const parseYmdUtc = (ymd: YmdDateString): Date => {
  const [y, m, d] = ymd.split("-");
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  return new Date(Date.UTC(year, month - 1, day));
};

const addDaysUtc = (ymd: YmdDateString, deltaDays: number): YmdDateString => {
  const base = parseYmdUtc(ymd);
  const next = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return toYmdUtc(next);
};

/**
 * Realtime "golden path" recompute.
 *
 * Trigger:
 * - On create of /users/{userId}/events/{eventId}
 *
 * Writes:
 * - /users/{userId}/dailyFacts/{day}
 * - /users/{userId}/insights/{insightId}
 * - /users/{userId}/intelligenceContext/{day}
 */
export const onCanonicalEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/events/{eventId}",
    region: "us-central1",
  },
  async (event) => {
    const userId = event.params.userId as string;
    const eventId = event.params.eventId as string;

    const data = event.data?.data() as CanonicalEvent | undefined;
    if (!data) {
      logger.warn("onCanonicalEventCreated: missing event data", { userId, eventId });
      return;
    }

    const day = data.day as YmdDateString;
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info("Realtime recompute started", { userId, eventId, day, kind: data.kind });

    const userRef = db.collection("users").doc(userId);

    // 1) Load ALL canonical events for this user+day.
    const eventsSnap = await userRef.collection("events").where("day", "==", day).get();
    const eventsForDay = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);

    const baseDailyFacts: DailyFacts = aggregateDailyFactsForDay({
      userId,
      date: day,
      computedAt,
      events: eventsForDay,
    });

    // 2) Load up to 6 prior days of DailyFacts for enrichment.
    const startDate = addDaysUtc(day, -6);
    const historySnap = await userRef
      .collection("dailyFacts")
      .where("date", ">=", startDate)
      .where("date", "<", day)
      .get();

    const historyFacts = historySnap.docs.map((d) => d.data() as DailyFacts);

    const enrichedDailyFacts = enrichDailyFactsWithBaselinesAndAverages({
      today: baseDailyFacts,
      history: historyFacts,
    });

    await userRef.collection("dailyFacts").doc(day).set(enrichedDailyFacts, { merge: true });

    // 3) Insights for this day.
    const insights = generateInsightsForDailyFacts({
      userId,
      date: day,
      today: enrichedDailyFacts,
      history: historyFacts,
      now: computedAt,
    });

    for (const insight of insights) {
      await userRef.collection("insights").doc(insight.id).set(insight, { merge: true });
    }

    // 4) Intelligence context doc.
    const ctxDoc = buildDailyIntelligenceContextDoc({
      userId,
      date: day,
      computedAt,
      today: enrichedDailyFacts,
      history: historyFacts,
      insightsForDay: insights,
    });

    await userRef.collection("intelligenceContext").doc(day).set(ctxDoc, { merge: true });

    logger.info("Realtime recompute completed", {
      userId,
      day,
      eventsForDay: eventsForDay.length,
      insightsWritten: insights.length,
    });
  }
);
