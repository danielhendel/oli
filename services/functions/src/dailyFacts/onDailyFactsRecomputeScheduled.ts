// services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type { WriteBatch } from "firebase-admin/firestore";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, DailyFacts, IsoDateTimeString, YmdDateString } from "../types/health";

import { aggregateDailyFactsForDay } from "./aggregateDailyFacts";
import { enrichDailyFactsWithBaselinesAndAverages } from "./enrichDailyFacts";

import { buildPipelineMeta } from "../pipeline/pipelineMeta";
import { computeLatencyMs, shouldWarnLatency } from "../pipeline/pipelineLatency";

import { makeLedgerRunIdFromSeed, writeDerivedLedgerRun } from "../pipeline/derivedLedger";

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
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

const getYesterdayUtcYmd = (): YmdDateString => {
  const now = new Date();
  return toYmdUtc(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)));
};

const commitBatches = async (batches: WriteBatch[]): Promise<void> => {
  for (const batch of batches) await batch.commit();
};

export const onDailyFactsRecomputeScheduled = onSchedule(
  {
    schedule: "0 3 * * *",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const targetDate = getYesterdayUtcYmd();
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info("DailyFacts recompute started", { targetDate });

    // We iterate users directly (avoid global collectionGroup writes assumptions)
    const usersSnap = await db.collection("users").select().get();
    if (usersSnap.empty) {
      logger.info("No users found; skipping DailyFacts recompute", { targetDate });
      return;
    }

    const MAX_OPS_PER_BATCH = 360;
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentOps = 0;

    let usersProcessed = 0;
    let docsWritten = 0;
    let usersWithNoEvents = 0;

    // Stable seed for this scheduled invocation (ScheduledEvent has no .id)
    const runIdBase = makeLedgerRunIdFromSeed(
      "sch_dailyFacts",
      `${String(event.jobName ?? "dailyFacts")}_${String(event.scheduleTime ?? computedAt)}_${targetDate}`,
    );
    const triggerEventId = `${String(event.jobName ?? "dailyFacts")}_${String(event.scheduleTime ?? computedAt)}`;

    const startHistoryDate = addDaysUtc(targetDate, -6);

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userRef = db.collection("users").doc(userId);

      // Canonical events for this day
      const eventsSnap = await userRef.collection("events").where("day", "==", targetDate).get();
      const eventsForDay = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);

      if (eventsForDay.length === 0) {
        usersWithNoEvents += 1;

        // Still emit a ledger run with no dailyFacts snapshot? For Phase 1 truthfulness,
        // we emit a run with an empty derived snapshot showing "no events → minimal facts".
        // Aggregate will produce a valid dailyFacts doc deterministically even if events=[].
      }

      const latestCanonicalEventAt: IsoDateTimeString | undefined =
        eventsForDay.reduce<IsoDateTimeString | undefined>((max, ev) => {
          const t = ev.updatedAt ?? ev.createdAt;
          if (!t) return max;
          if (!max) return t;
          return t > max ? t : max;
        }, undefined) ?? undefined;

      const baseDailyFacts: DailyFacts = aggregateDailyFactsForDay({
        userId,
        date: targetDate,
        computedAt,
        events: eventsForDay,
      });

      // Load history for enrichment (prior 6 days)
      const historySnap = await userRef
        .collection("dailyFacts")
        .where("date", ">=", startHistoryDate)
        .where("date", "<", targetDate)
        .get();

      const historyFacts = historySnap.docs.map((d) => d.data() as DailyFacts);

      const enriched = enrichDailyFactsWithBaselinesAndAverages({
        today: baseDailyFacts,
        history: historyFacts,
      });

      const dailyFactsWithMeta = {
        ...enriched,
        meta: buildPipelineMeta({
          computedAt: latestCanonicalEventAt ?? computedAt,
          source: {
            eventsForDay: eventsForDay.length,
            ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
          },
        }),
      };

      // Batch write "latest" DailyFacts pointer doc
      if (currentOps >= MAX_OPS_PER_BATCH) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentOps = 0;
      }

      currentBatch.set(userRef.collection("dailyFacts").doc(targetDate), dailyFactsWithMeta);
      currentOps += 1;

      // Ledger run (append-only)
      const runId = `${runIdBase}_${userId}`;
      const pipelineVersion = 1;

      await writeDerivedLedgerRun({
        db,
        userId,
        date: targetDate,
        runId,
        computedAt,
        pipelineVersion,
        trigger: { type: "scheduled", name: "onDailyFactsRecomputeScheduled", eventId: triggerEventId },
        ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
        dailyFacts: dailyFactsWithMeta as unknown as object,
      });

      // Latency logging (if we have a canonical anchor)
      if (latestCanonicalEventAt) {
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
      }

      usersProcessed += 1;
      docsWritten += 1;
    }

    if (currentOps > 0) batches.push(currentBatch);
    if (batches.length > 0) await commitBatches(batches);

    logger.info("DailyFacts recompute completed", {
      targetDate,
      usersProcessed,
      docsWritten,
      usersWithNoEvents,
      batchesCommitted: batches.length,
    });
  },
);
