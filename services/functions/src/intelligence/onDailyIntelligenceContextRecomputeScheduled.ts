// services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type { WriteBatch } from "firebase-admin/firestore";

import { db } from "../firebaseAdmin";
import type { CanonicalEvent, DailyFacts, Insight, IsoDateTimeString, YmdDateString } from "../types/health";
import { buildDailyIntelligenceContext } from "./buildDailyIntelligenceContext";

import { buildPipelineMeta } from "../pipeline/pipelineMeta";
import { computeLatencyMs, shouldWarnLatency } from "../pipeline/pipelineLatency";

import { makeLedgerRunIdFromSeed, writeDerivedLedgerRun } from "../pipeline/derivedLedger";

type PipelineMetaLike = {
  pipelineVersion?: number;
  source?: Record<string, unknown>;
};

function readPipelineMetaLike(value: unknown): PipelineMetaLike | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const meta = rec["meta"];
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;

  const pipelineVersion = typeof m["pipelineVersion"] === "number" ? m["pipelineVersion"] : undefined;
  const source =
    typeof m["source"] === "object" && m["source"] !== null ? (m["source"] as Record<string, unknown>) : undefined;

    return {
      ...(pipelineVersion !== undefined ? { pipelineVersion } : {}),
      ...(source !== undefined ? { source } : {}),
    };    
}

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
  return toYmdUtc(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)));
};

const commitBatches = async (batches: WriteBatch[]): Promise<void> => {
  for (const batch of batches) await batch.commit();
};

export const onDailyIntelligenceContextRecomputeScheduled = onSchedule(
  {
    schedule: "30 3 * * *",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const targetDate = getYesterdayUtcYmd();
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info("DailyIntelligenceContext recompute started", { targetDate });

    const dailyFactsSnapshot = await db.collectionGroup("dailyFacts").where("date", "==", targetDate).get();
    if (dailyFactsSnapshot.empty) {
      logger.info("No DailyFacts found for target date", { targetDate });
      return;
    }

    const MAX_OPS_PER_BATCH = 360;
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentOps = 0;

    let usersProcessed = 0;
    let docsWritten = 0;

    // Stable-ish seed for this scheduled invocation (ScheduledEvent has no .id)
    const runIdBase = makeLedgerRunIdFromSeed(
      "sch_ctx",
      `${String(event.jobName ?? "ctx")}_${String(event.scheduleTime ?? computedAt)}_${targetDate}`,
    );

    const triggerEventId = `${String(event.jobName ?? "ctx")}_${String(event.scheduleTime ?? computedAt)}`;

    for (const doc of dailyFactsSnapshot.docs) {
      const userId = doc.ref.parent.parent?.id;
      if (!userId) {
        logger.warn("Skipping DailyFacts doc with unexpected path", { path: doc.ref.path });
        continue;
      }

      const today = doc.data() as DailyFacts;
      if (!today || today.userId !== userId || today.date !== targetDate) {
        logger.warn("Skipping DailyFacts doc with inconsistent data", {
          path: doc.ref.path,
          userIdFromPath: userId,
          userIdFromDoc: today?.userId,
          dateFromDoc: today?.date,
          targetDate,
        });
        continue;
      }

      const userRef = db.collection("users").doc(userId);

      const insightsSnap = await userRef.collection("insights").where("date", "==", targetDate).get();
      const insightsForDay = insightsSnap.docs.map((d) => d.data() as Insight);

      const eventsSnap = await userRef.collection("events").where("day", "==", targetDate).get();
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
        date: targetDate,
        computedAt,
        today,
        insightsForDay,
      });

      const intelligenceWithMeta = {
        ...intelligenceDoc,
        meta: buildPipelineMeta({
          computedAt: latestCanonicalEventAt,
          source: {
            eventsForDay: eventsForDay.length,
            insightsWritten: insightsForDay.length,
          },
        }),
      };

      if (currentOps >= MAX_OPS_PER_BATCH) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentOps = 0;
      }

      const outRef = userRef.collection("intelligenceContext").doc(targetDate);
      currentBatch.set(outRef, intelligenceWithMeta);
      currentOps += 1;

      // ✅ Ledger run (retry-safe per scheduler seed + user)
      const runId = `${runIdBase}_${userId}`;

      const todayPipelineVersion = readPipelineMetaLike(today)?.pipelineVersion ?? 1;
      const intelligencePipelineVersion = readPipelineMetaLike(intelligenceWithMeta)?.pipelineVersion ?? undefined;
      const pipelineVersion = intelligencePipelineVersion ?? todayPipelineVersion;

      await writeDerivedLedgerRun({
        db,
        userId,
        date: targetDate,
        runId,
        computedAt,
        pipelineVersion,
        trigger: { type: "scheduled", name: "onDailyIntelligenceContextRecomputeScheduled", eventId: triggerEventId },
        ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
        intelligenceContext: intelligenceWithMeta,
      });

      const latencyMs = computeLatencyMs(computedAt, latestCanonicalEventAt);
      const warnAfterSec = 30;

      if (shouldWarnLatency(latencyMs, warnAfterSec)) {
        logger.warn("Pipeline latency high (canonical→context)", { userId, date: targetDate, latencyMs, warnAfterSec });
      } else {
        logger.info("Pipeline latency (canonical→context)", { userId, date: targetDate, latencyMs });
      }

      usersProcessed += 1;
      docsWritten += 1;
    }

    if (currentOps > 0) batches.push(currentBatch);
    await commitBatches(batches);

    logger.info("DailyIntelligenceContext recompute completed", {
      targetDate,
      usersProcessed,
      docsWritten,
      batchesCommitted: batches.length,
    });
  },
);
