// services/functions/src/realtime/onCanonicalEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, DailyFacts, IsoDateTimeString, YmdDateString } from "../types/health";
import { aggregateDailyFactsForDay } from "../dailyFacts/aggregateDailyFacts";
import { enrichDailyFactsWithBaselinesAndAverages } from "../dailyFacts/enrichDailyFacts";
import { generateInsightsForDailyFacts } from "../insights/rules";
import { buildDailyIntelligenceContextDoc } from "../intelligence/buildDailyIntelligenceContext";

// ✅ Insights authority: prune stale docs after recompute
import { pruneInsightsForDay } from "../insights/pruneInsightsForDay";

// ✅ Data Readiness Contract
import { buildPipelineMeta } from "../pipeline/pipelineMeta";

// ✅ Latency logging (canonical → derived)
import { computeLatencyMs, shouldWarnLatency } from "../pipeline/pipelineLatency";

const FUNCTION_REGION = "us-central1";

// ✅ IMPORTANT: This is the runtime identity for the Gen2 function execution.
// Make sure this service account exists and has the permissions you expect.
const RUNTIME_SERVICE_ACCOUNT = "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com";

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
    region: FUNCTION_REGION,

    // ✅ Force Gen2 to execute as this service account (reliable vs setGlobalOptions)
    serviceAccount: RUNTIME_SERVICE_ACCOUNT,
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

    /**
     * 1) Load ALL canonical events for this user + day
     */
    const eventsSnap = await userRef.collection("events").where("day", "==", day).get();
    const eventsForDay = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);

    // Latest canonical timestamp = truth anchor for readiness
    const latestCanonicalEventAt: IsoDateTimeString =
      eventsForDay.reduce<IsoDateTimeString | null>((max, ev) => {
        const t = ev.updatedAt ?? ev.createdAt;
        if (!t) return max;
        if (!max) return t;
        return t > max ? t : max;
      }, null) ?? computedAt;

    const baseDailyFacts: DailyFacts = aggregateDailyFactsForDay({
      userId,
      date: day,
      computedAt,
      events: eventsForDay,
    });

    /**
     * 2) Load up to 6 prior days of DailyFacts for enrichment
     */
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

    // ✅ Write DailyFacts with readiness meta
    await userRef.collection("dailyFacts").doc(day).set(
      {
        ...enrichedDailyFacts,
        meta: buildPipelineMeta({
          computedAt, // ✅ actual compute time
          source: {
            eventsForDay: eventsForDay.length,
            latestCanonicalEventAt, // ✅ preserve truth anchor explicitly
          },
        }),
      },
      { merge: true },
    );

    /**
     * 3) Insights for this day (AUTHORITATIVE: upsert + prune)
     */
    const insights = generateInsightsForDailyFacts({
      userId,
      date: day,
      today: enrichedDailyFacts,
      history: historyFacts,
      now: computedAt,
    });

    // Upsert generated insights in a single batch
    const insightsBatch = db.batch();
    const insightsCol = userRef.collection("insights");
    for (const insight of insights) {
      insightsBatch.set(insightsCol.doc(insight.id), insight, { merge: true });
    }
    await insightsBatch.commit();

    // Prune stale insights for this day that are no longer generated
    const keepIds = new Set(insights.map((i) => i.id));
    const pruneRes = await pruneInsightsForDay({
      userRef,
      day,
      keepIds,
    });

    const insightsPruned = pruneRes.deleted;

    /**
     * 4) Intelligence Context
     */
    const ctxDoc = buildDailyIntelligenceContextDoc({
      userId,
      date: day,
      computedAt,
      today: enrichedDailyFacts,
      history: historyFacts,
      insightsForDay: insights,
    });

    // ✅ Write IntelligenceContext with readiness meta
    await userRef.collection("intelligenceContext").doc(day).set(
      {
        ...ctxDoc,
        meta: buildPipelineMeta({
          computedAt, // ✅ actual compute time
          source: {
            eventsForDay: eventsForDay.length,
            insightsWritten: insights.length,
            insightsPruned, // ✅ NEW: authoritative recompute signal
            latestCanonicalEventAt, // ✅ preserve truth anchor explicitly
          },
        }),
      },
      { merge: true },
    );

    // ✅ Latency logging (canonical → derived)
    const latencyMs = computeLatencyMs(computedAt, latestCanonicalEventAt);
    const warnAfterSec = 30;

    if (shouldWarnLatency(latencyMs, warnAfterSec)) {
      logger.warn("Pipeline latency high (canonical→derived)", { userId, day, latencyMs, warnAfterSec });
    } else {
      logger.info("Pipeline latency (canonical→derived)", { userId, day, latencyMs });
    }

    logger.info("Realtime recompute completed", {
      userId,
      day,
      eventsForDay: eventsForDay.length,
      insightsWritten: insights.length,
      insightsPruned,
    });
  },
);
