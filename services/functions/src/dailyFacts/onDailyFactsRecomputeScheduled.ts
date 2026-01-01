// services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type { WriteBatch } from "firebase-admin/firestore";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, DailyFacts, IsoDateTimeString, YmdDateString } from "../types/health";
import { aggregateDailyFactsForDay } from "./aggregateDailyFacts";
import { enrichDailyFactsWithBaselinesAndAverages } from "./enrichDailyFacts";

// ✅ Data Readiness Contract
import { buildPipelineMeta } from "../pipeline/pipelineMeta";

// ✅ Latency logging (canonical → dailyFacts)
import { computeLatencyMs, shouldWarnLatency } from "../pipeline/pipelineLatency";

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
};

const getYesterdayUtcYmd = (): YmdDateString => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return toYmdUtc(new Date(Date.UTC(y, m, d - 1)));
};

const commitBatches = async (batches: WriteBatch[]): Promise<void> => {
  for (const batch of batches) {
    await batch.commit();
  }
};

/**
 * Scheduled job:
 *  - Runs daily (UTC)
 *  - For each user with any canonical events on targetDate:
 *      - Load all canonical events for that day
 *      - Build base DailyFacts
 *      - Enrich with up to 6 prior days DailyFacts
 *      - Write to /users/{userId}/dailyFacts/{YYYY-MM-DD}
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/events/{eventId} (where day == targetDate)
 *  - Input:  /users/{userId}/dailyFacts/{yyyy-MM-dd} (history window)
 *  - Output: /users/{userId}/dailyFacts/{yyyy-MM-dd}
 */
export const onDailyFactsRecomputeScheduled = onSchedule(
  {
    // Runs daily at 03:00 UTC
    schedule: "0 3 * * *",
    region: "us-central1",
  },
  async () => {
    const targetDate = getYesterdayUtcYmd();
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info("DailyFacts recompute started", { targetDate });

    // Find all users who have canonical events for targetDate.
    const eventsSnapshot = await db.collectionGroup("events").where("day", "==", targetDate).get();

    if (eventsSnapshot.empty) {
      logger.info("No canonical events found for target date", { targetDate });
      return;
    }

    // Group events by userId (from path: users/{userId}/events/{eventId})
    const eventsByUser = new Map<string, CanonicalEvent[]>();
    for (const doc of eventsSnapshot.docs) {
      const userId = doc.ref.parent.parent?.id;
      if (!userId) {
        logger.warn("Skipping event doc with unexpected path", { path: doc.ref.path });
        continue;
      }
      const ev = doc.data() as CanonicalEvent;
      const arr = eventsByUser.get(userId);
      if (arr) arr.push(ev);
      else eventsByUser.set(userId, [ev]);
    }

    const MAX_OPS_PER_BATCH = 450;
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentOps = 0;

    let usersProcessed = 0;
    let docsWritten = 0;

    for (const [userId, eventsForDay] of eventsByUser.entries()) {
      const userRef = db.collection("users").doc(userId);

      // Truth anchor for readiness: latest canonical timestamp for the day
      const latestCanonicalEventAt: IsoDateTimeString =
        eventsForDay.reduce<IsoDateTimeString | null>((max, ev) => {
          const t = ev.updatedAt ?? ev.createdAt;
          if (!t) return max;
          if (!max) return t;
          return t > max ? t : max;
        }, null) ?? computedAt;

      const base: DailyFacts = aggregateDailyFactsForDay({
        userId,
        date: targetDate,
        computedAt,
        events: eventsForDay,
      });

      // Load up-to-6 prior days for enrichment window
      const startDate = (() => {
        const baseDate = new Date(Date.parse(`${targetDate}T00:00:00.000Z`));
        // If parsing fails (shouldn't), fallback to computedAt day boundary:
        if (Number.isNaN(baseDate.getTime())) return targetDate;
        baseDate.setUTCDate(baseDate.getUTCDate() - 6);
        return toYmdUtc(baseDate);
      })();

      const historySnap = await userRef
        .collection("dailyFacts")
        .where("date", ">=", startDate)
        .where("date", "<", targetDate)
        .get();

      const history: DailyFacts[] = historySnap.docs.map((d) => d.data() as DailyFacts);

      const enriched = enrichDailyFactsWithBaselinesAndAverages({
        today: base,
        history,
      });

      if (currentOps >= MAX_OPS_PER_BATCH) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentOps = 0;
      }

      const outRef = userRef.collection("dailyFacts").doc(targetDate);

      currentBatch.set(
        outRef,
        {
          ...enriched,
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
      currentOps += 1;

      // ✅ Latency logging (canonical → dailyFacts)
      const latencyMs = computeLatencyMs(computedAt, latestCanonicalEventAt);
      const warnAfterSec = 30;

      if (shouldWarnLatency(latencyMs, warnAfterSec)) {
        logger.warn("Pipeline latency high (canonical→dailyFacts)", {
          userId,
          date: targetDate,
          latencyMs,
          warnAfterSec,
        });
      } else {
        logger.info("Pipeline latency (canonical→dailyFacts)", { userId, date: targetDate, latencyMs });
      }

      usersProcessed += 1;
      docsWritten += 1;
    }

    if (currentOps > 0) {
      batches.push(currentBatch);
    }

    await commitBatches(batches);

    logger.info("DailyFacts recompute completed", {
      targetDate,
      usersProcessed,
      docsWritten,
      batchesCommitted: batches.length,
    });
  },
);
