// services/functions/src/insights/onInsightsRecomputeScheduled.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type { WriteBatch } from "firebase-admin/firestore";

import { db } from "../firebaseAdmin";
import type { DailyFacts, IsoDateTimeString, YmdDateString } from "../types/health";
import { generateInsightsForDailyFacts } from "./rules";

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

function readLatestCanonicalEventAtFromMeta(value: unknown): string | undefined {
  const meta = readPipelineMetaLike(value);
  if (!meta?.source) return undefined;
  const v = meta.source["latestCanonicalEventAt"];
  return typeof v === "string" ? v : undefined;
}

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
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

const buildWindowDatesInclusive = (endDate: YmdDateString, windowSizeDays: number): YmdDateString[] => {
  const dates: YmdDateString[] = [];
  for (let i = windowSizeDays - 1; i >= 0; i--) dates.push(addDaysUtc(endDate, -i));
  return dates;
};

const sortByDateAsc = (a: DailyFacts, b: DailyFacts): number => {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
};

const commitBatches = async (batches: WriteBatch[]): Promise<void> => {
  for (const batch of batches) await batch.commit();
};

export const onInsightsRecomputeScheduled = onSchedule(
  {
    schedule: "15 3 * * *",
    region: "us-central1",
    serviceAccount: "oli-functions-runtime@oli-staging-fdbba.iam.gserviceaccount.com",
  },
  async (event) => {
    const targetDate = getYesterdayUtcYmd();
    const now: IsoDateTimeString = new Date().toISOString();

    const windowDates = buildWindowDatesInclusive(targetDate, 7);

    logger.info("Insights recompute started", { targetDate, windowDates });

    const dailyFactsSnapshot = await db.collectionGroup("dailyFacts").where("date", "==", targetDate).get();
    if (dailyFactsSnapshot.empty) {
      logger.info("No DailyFacts found for target date", { targetDate });
      return;
    }

    const MAX_OPS_PER_BATCH = 350;
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentOps = 0;

    let usersProcessed = 0;
    let insightsWritten = 0;
    let usersWithNoHistory = 0;

    // Stable-ish seed for this scheduled invocation (ScheduledEvent has no .id)
    const runIdBase = makeLedgerRunIdFromSeed(
      "sch_insights",
      `${String(event.jobName ?? "insights")}_${String(event.scheduleTime ?? now)}_${targetDate}`,
    );

    const triggerEventId = `${String(event.jobName ?? "insights")}_${String(event.scheduleTime ?? now)}`;

    for (const doc of dailyFactsSnapshot.docs) {
      const userId = doc.ref.parent.parent?.id;
      if (!userId) {
        logger.warn("Skipping DailyFacts doc with unexpected path", { path: doc.ref.path });
        continue;
      }

      const todayFacts = doc.data() as DailyFacts;
      if (!todayFacts || todayFacts.userId !== userId || todayFacts.date !== targetDate) {
        logger.warn("Skipping DailyFacts doc with inconsistent data", {
          path: doc.ref.path,
          userIdFromPath: userId,
          userIdFromDoc: todayFacts?.userId,
          dateFromDoc: todayFacts?.date,
          targetDate,
        });
        continue;
      }

      const userRef = db.collection("users").doc(userId);

      const windowSnap = await userRef.collection("dailyFacts").where("date", "in", windowDates).get();
      const windowFacts = windowSnap.docs.map((d) => d.data() as DailyFacts).sort(sortByDateAsc);

      const today = windowFacts.find((f) => f.date === targetDate) ?? todayFacts;
      const history = windowFacts.filter((f) => f.date !== targetDate);

      if (history.length === 0) usersWithNoHistory += 1;

      const insights = generateInsightsForDailyFacts({
        userId,
        date: targetDate,
        today,
        history,
        now,
      });

      usersProcessed += 1;

      // Always write a ledger run even if no insights (“no insights were known”)
      const runId = `${runIdBase}_${userId}`;

      // Anchor (best available): dailyFacts meta source.latestCanonicalEventAt if present
      const latestCanonicalEventAt = readLatestCanonicalEventAtFromMeta(todayFacts);

      const pipelineVersion = readPipelineMetaLike(todayFacts)?.pipelineVersion ?? 1;

      // ✅ Step 6: canonical event IDs used (truth anchor), deterministic order
      // NOTE: Cannot assume all canonical docs have "start" across kinds.
      const eventsSnap = await userRef
        .collection("events")
        .where("day", "==", targetDate)
        .orderBy("__name__", "asc")
        .get();

      const canonicalEventIds = eventsSnap.docs.map((d) => d.id);

      await writeDerivedLedgerRun({
        db,
        userId,
        date: targetDate,
        runId,
        computedAt: now,
        pipelineVersion,
        trigger: { type: "scheduled", name: "onInsightsRecomputeScheduled", eventId: triggerEventId },
        canonicalEventIds,
        ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
        insights,
      });

      if (insights.length === 0) continue;

      const insightsCol = userRef.collection("insights");

      for (const insight of insights) {
        if (currentOps >= MAX_OPS_PER_BATCH) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          currentOps = 0;
        }

        currentBatch.set(insightsCol.doc(insight.id), insight);
        currentOps += 1;
        insightsWritten += 1;
      }
    }

    if (currentOps > 0) batches.push(currentBatch);
    if (batches.length > 0) await commitBatches(batches);

    logger.info("Insights recompute completed", {
      targetDate,
      usersProcessed,
      usersWithNoHistory,
      insightsWritten,
      batchesCommitted: batches.length,
    });
  },
);
