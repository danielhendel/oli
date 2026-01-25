// services/functions/src/realtime/onCanonicalEventCreated.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, DailyFacts, Insight, IsoDateTimeString, YmdDateString } from "../types/health";

import { aggregateDailyFactsForDay } from "../dailyFacts/aggregateDailyFacts";
import { enrichDailyFactsWithBaselinesAndAverages } from "../dailyFacts/enrichDailyFacts";

import { generateInsightsForDailyFacts } from "../insights/rules";
import { buildDailyIntelligenceContext } from "../intelligence/buildDailyIntelligenceContext";

import { buildPipelineMeta } from "../pipeline/pipelineMeta";
import { computeLatencyMs, shouldWarnLatency } from "../pipeline/pipelineLatency";

import { makeLedgerRunIdFromSeed, writeDerivedLedgerRun } from "../pipeline/derivedLedger";

const FUNCTION_REGION = "us-central1";
const RUNTIME_SERVICE_ACCOUNT = "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com";

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year.toString().padStart(4, "0")}-${month}-${day}`;
};

const parseIntStrict = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseYmdUtc = (ymd: YmdDateString): Date => {
  const parts = ymd.split("-");
  if (parts.length !== 3) throw new Error(`Invalid YmdDateString: "${ymd}"`);
  const y = parseIntStrict(parts[0] ?? "");
  const m = parseIntStrict(parts[1] ?? "");
  const d = parseIntStrict(parts[2] ?? "");
  if (y === null || m === null || d === null) throw new Error(`Invalid YmdDateString: "${ymd}"`);
  return new Date(Date.UTC(y, m - 1, d));
};

const addDaysUtc = (ymd: YmdDateString, deltaDays: number): YmdDateString => {
  const base = parseYmdUtc(ymd);
  const next = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return toYmdUtc(next);
};

export const onCanonicalEventCreated = onDocumentCreated(
  {
    document: "users/{userId}/events/{eventId}",
    region: FUNCTION_REGION,
    serviceAccount: RUNTIME_SERVICE_ACCOUNT,
  },
  async (event) => {
    const userId = String(event.params.userId);
    const eventId = String(event.params.eventId);

    const canonical = event.data?.data() as CanonicalEvent | undefined;
    if (!canonical) {
      logger.warn("onCanonicalEventCreated: missing canonical event data", { userId, eventId });
      return;
    }

    const day = canonical.day as YmdDateString;
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info("Realtime recompute started", { userId, eventId, day, kind: canonical.kind });

    const userRef = db.collection("users").doc(userId);

    // Canonical events for this day (truth anchor)
    const eventsSnap = await userRef.collection("events").where("day", "==", day).get();
    const eventsForDay = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);

    const latestCanonicalEventAt: IsoDateTimeString | undefined =
      eventsForDay.reduce<IsoDateTimeString | undefined>((max, ev) => {
        const t = ev.updatedAt ?? ev.createdAt;
        if (!t) return max;
        if (!max) return t;
        return t > max ? t : max;
      }, undefined) ?? undefined;

    // DailyFacts for this day
    const baseDailyFacts: DailyFacts = aggregateDailyFactsForDay({
      userId,
      date: day,
      computedAt,
      events: eventsForDay,
    });

    // Prior 6 days for enrichment
    const startHistoryDate = addDaysUtc(day, -6);
    const historySnap = await userRef
      .collection("dailyFacts")
      .where("date", ">=", startHistoryDate)
      .where("date", "<", day)
      .get();

    const historyFacts = historySnap.docs.map((d) => d.data() as DailyFacts);

    const enrichedDailyFacts = enrichDailyFactsWithBaselinesAndAverages({
      today: baseDailyFacts,
      history: historyFacts,
    });

    const dailyFactsWithMeta = {
      ...enrichedDailyFacts,
      meta: buildPipelineMeta({
        computedAt,
        source: {
          eventsForDay: eventsForDay.length,
          ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
        },
      }),
    };

    // ✅ Authoritative write (NO merge)
    await userRef.collection("dailyFacts").doc(day).set(dailyFactsWithMeta);

    // Insights
    const insights: Insight[] = generateInsightsForDailyFacts({
      userId,
      date: day,
      today: enrichedDailyFacts,
      history: historyFacts,
      now: computedAt,
    });

    for (const insight of insights) {
      // ✅ Authoritative write (NO merge)
      await userRef.collection("insights").doc(insight.id).set(insight);
    }

    // Intelligence Context
    const ctxDoc = buildDailyIntelligenceContext({
      userId,
      date: day,
      computedAt,
      today: enrichedDailyFacts,
      insightsForDay: insights,
    });

    // ✅ Truth anchor for readiness: latest canonical event time (fallback to computedAt)
    const ctxComputedAt = latestCanonicalEventAt ?? computedAt;

    const ctxWithMeta = {
      ...ctxDoc,
      meta: buildPipelineMeta({
        computedAt: ctxComputedAt,
        source: {
          eventsForDay: eventsForDay.length,
          insightsWritten: insights.length,
          ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
        },
      }),
    };

    // ✅ Authoritative write (NO merge)
    await userRef.collection("intelligenceContext").doc(day).set(ctxWithMeta);

    // Derived Ledger run (append-only, retry-safe)
    const runId = makeLedgerRunIdFromSeed("rt", `onCanonicalEventCreated_${eventId}_${day}`);
    const pipelineVersion = 1;

    await writeDerivedLedgerRun({
      db,
      userId,
      date: day,
      runId,
      computedAt,
      pipelineVersion,
      trigger: { type: "realtime", name: "onCanonicalEventCreated", eventId },
      ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
      dailyFacts: dailyFactsWithMeta as unknown as object,
      intelligenceContext: ctxWithMeta as unknown as object,
      insights: insights as unknown as object[],
    });

    // Latency logging (only if we have an anchor)
    if (latestCanonicalEventAt) {
      const latencyMs = computeLatencyMs(computedAt, latestCanonicalEventAt);
      const warnAfterSec = 30;

      if (shouldWarnLatency(latencyMs, warnAfterSec)) {
        logger.warn("Pipeline latency high (canonical→derived)", { userId, day, latencyMs, warnAfterSec });
      } else {
        logger.info("Pipeline latency (canonical→derived)", { userId, day, latencyMs });
      }
    }

    logger.info("Realtime recompute completed", {
      userId,
      day,
      eventsForDay: eventsForDay.length,
      insightsWritten: insights.length,
    });
  },
);