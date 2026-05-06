// services/functions/src/pipeline/recomputeForDay.ts

/**
 * Shared recompute pipeline for derived truth (dailyFacts, insights, intelligenceContext).
 * Used by:
 * - onRawEventCreated (fact-only trigger)
 * - HTTP admin recompute (delegates to same logic)
 *
 * Idempotent: overwrites are allowed for derived truth.
 */

import type { Firestore } from "firebase-admin/firestore";
import type {
  CanonicalEvent,
  DailyFacts,
  DailyBodyFacts,
  Insight,
  IsoDateTimeString,
  YmdDateString,
} from "../types/health";
import { aggregateDailyFactsForDay } from "../dailyFacts/aggregateDailyFacts";
import { enrichDailyFactsWithBaselinesAndAverages } from "../dailyFacts/enrichDailyFacts";
import { loadBodyFactsFromRawForDay } from "../dailyFacts/loadBodyFactsFromRawForDay";
import { generateInsightsForDailyFacts } from "../insights/rules";
import { buildDailyIntelligenceContext } from "../intelligence/buildDailyIntelligenceContext";
import { buildPipelineMeta } from "./pipelineMeta";
import { makeLedgerRunIdFromSeed, writeDerivedLedgerRun } from "./derivedLedger";
import { attachOliSleepScoreToSleepFacts } from "../sleep/computeOliSleepScoreV1";
import { computeHealthScoreV1 } from "../healthScore/computeHealthScoreV1";
import { writeHealthScoreImmutable } from "../healthScore/writeHealthScoreImmutable";
import { BASELINE_WINDOW_DAYS, SIGNAL_THRESHOLDS } from "../healthSignals/constants";
import { computeHealthSignalsV1 } from "../healthSignals/computeHealthSignalsV1";
import { writeHealthSignalsImmutable } from "../healthSignals/writeHealthSignalsImmutable";
import type { HealthScoreDocForSignals } from "../healthSignals/computeHealthSignalsV1";
import { resolveDailyEnergyForFactsV1 } from "../energy/resolveDailyEnergyForFactsV1";
import { buildDailyEnergyInfluencersFromFacts } from "../energy/buildDailyEnergyInfluencers";

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
  const yy = next.getUTCFullYear();
  const mm = (next.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = next.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

/** Two consecutive identical snapshots ⇒ no canonical doc changed between reads (best-effort). */
function canonicalEventsFingerprint(events: CanonicalEvent[]): string {
  return [...events]
    .map((e) => {
      const t = e.updatedAt ?? (e as { createdAt?: string }).createdAt ?? "";
      return `${e.kind}\0${e.id}\0${t}`;
    })
    .sort()
    .join("\u0001");
}

export interface RecomputeForDayInput {
  db: Firestore;
  userId: string;
  dayKey: YmdDateString;
  /**
   * Hard lock from normalization: mapped canonical `day` for the raw event that triggered recompute.
   * When set, must equal `dayKey` or the function throws before any reads/writes (no silent wrong-day DailyFacts).
   */
  canonicalAnchorDay?: YmdDateString;
  /** Body facts from fact-only raw events (e.g. weight). When provided, merged into dailyFacts when no canonical weight events exist. */
  factOnlyBody?: DailyBodyFacts;
  trigger: { type: "factOnly"; rawEventId: string } | { type: "realtime"; eventId: string } | { type: "admin"; source: string };
}

/**
 * Recompute derived truth for a single user+day: dailyFacts, insights, intelligenceContext.
 * Idempotent; overwrites are allowed.
 */
export async function recomputeDerivedTruthForDay(input: RecomputeForDayInput): Promise<void> {
  const { db, userId, dayKey, trigger, canonicalAnchorDay } = input;
  const computedAt: IsoDateTimeString = new Date().toISOString();

  if (canonicalAnchorDay !== undefined && canonicalAnchorDay !== dayKey) {
    throw new Error(
      `recomputeDerivedTruthForDay: RECOMPUTE_DAY_MISMATCH dayKey=${dayKey} canonicalAnchorDay=${canonicalAnchorDay}`,
    );
  }

  const userRef = db.collection("users").doc(userId);

  // Load canonical events for the day — stabilize with two identical consecutive reads so a long
  // recompute does not write dailyFacts from a snapshot that was already superseded mid-flight.
  let eventsForDay: CanonicalEvent[] = [];
  let fpPrev: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const eventsSnap = await userRef.collection("events").where("day", "==", dayKey).get();
    eventsForDay = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);
    const fp = canonicalEventsFingerprint(eventsForDay);
    if (fp === fpPrev) break;
    fpPrev = fp;
  }

  const drift = eventsForDay.find((e) => e.day !== dayKey);
  if (drift) {
    throw new Error(
      `recomputeDerivedTruthForDay: RECOMPUTE_CANONICAL_DAY_DRIFT dayKey=${dayKey} eventId=${drift.id} event.day=${drift.day}`,
    );
  }

  const latestCanonicalEventAt: IsoDateTimeString | undefined =
    eventsForDay.reduce<IsoDateTimeString | undefined>((max, ev) => {
      const t = ev.updatedAt ?? (ev as { createdAt?: string }).createdAt;
      if (!t) return max;
      if (!max) return t;
      return t > max ? t : max;
    }, undefined);

  // Truth anchor for readiness (fact-only may have no canonical events)
  const truthAnchor = latestCanonicalEventAt ?? computedAt;

  // Source-aware body facts from raw weight events + preferences.metricSources (Slice 2)
  const resolvedBody = await loadBodyFactsFromRawForDay(db, userId, dayKey);

  const baseDailyFacts = aggregateDailyFactsForDay({
    userId,
    date: dayKey,
    computedAt,
    events: eventsForDay,
    ...(resolvedBody ? { factOnlyBody: resolvedBody } : {}),
  });

  const startHistoryDate = addDaysUtc(dayKey, -6);
  const historySnap = await userRef
    .collection("dailyFacts")
    .where("date", ">=", startHistoryDate)
    .where("date", "<", dayKey)
    .get();

  const historyFacts = historySnap.docs.map((d) => d.data() as DailyFacts);

  const enrichedDailyFacts = enrichDailyFactsWithBaselinesAndAverages({
    today: baseDailyFacts,
    history: historyFacts,
  });

  const enrichedDailyFactsWithSleepScore: DailyFacts =
    enrichedDailyFacts.sleep !== undefined
      ? {
          ...enrichedDailyFacts,
          sleep: attachOliSleepScoreToSleepFacts(enrichedDailyFacts.sleep, {
            computedAt,
            ...(enrichedDailyFacts.confidence?.sleep !== undefined
              ? { domainConfidenceSleep: enrichedDailyFacts.confidence.sleep }
              : {}),
          }),
        }
      : enrichedDailyFacts;
  const dailyEnergy = await resolveDailyEnergyForFactsV1({
    db,
    userId,
    dailyFacts: enrichedDailyFactsWithSleepScore,
  });
  const enrichedDailyFactsWithEnergy: DailyFacts = dailyEnergy
    ? { ...enrichedDailyFactsWithSleepScore, energy: dailyEnergy }
    : enrichedDailyFactsWithSleepScore;
  const energyInfluencers = buildDailyEnergyInfluencersFromFacts(enrichedDailyFactsWithEnergy);
  const dailyFactsWithEnergyInfluencers: DailyFacts = energyInfluencers
    ? { ...enrichedDailyFactsWithEnergy, energyInfluencers }
    : enrichedDailyFactsWithEnergy;

  const dailyFactsWithMeta = {
    ...dailyFactsWithEnergyInfluencers,
    meta: buildPipelineMeta({
      computedAt: truthAnchor,
      source: {
        eventsForDay: eventsForDay.length,
        ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
        ...(resolvedBody ? { bodyFromRawAndPreferences: true } : {}),
      },
    }),
  };

  await userRef.collection("dailyFacts").doc(dayKey).set(dailyFactsWithMeta);

  const insights: Insight[] = generateInsightsForDailyFacts({
    userId,
    date: dayKey,
    today: enrichedDailyFactsWithEnergy,
    history: historyFacts,
    now: computedAt,
  });

  for (const insight of insights) {
    await userRef.collection("insights").doc(insight.id).set(insight);
  }

  const ctxDoc = buildDailyIntelligenceContext({
    userId,
    date: dayKey,
    computedAt,
    today: enrichedDailyFactsWithEnergy,
    insightsForDay: insights,
  });

  const ctxWithMeta = {
    ...ctxDoc,
    meta: buildPipelineMeta({
      computedAt: truthAnchor,
      source: {
        eventsForDay: eventsForDay.length,
        insightsWritten: insights.length,
        ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
      },
    }),
  };

  await userRef.collection("intelligenceContext").doc(dayKey).set(ctxWithMeta);

  const healthScoreDoc = computeHealthScoreV1({
    userId,
    date: dayKey,
    today: enrichedDailyFactsWithEnergy,
    history: historyFacts,
    computedAt,
    pipelineVersion: 1,
  });
  await writeHealthScoreImmutable({
    db,
    userId,
    dayKey,
    doc: healthScoreDoc,
  });

  const signalsBaselineStart = addDaysUtc(dayKey, -BASELINE_WINDOW_DAYS);
  const healthScoreHistorySnap = await userRef
    .collection("healthScores")
    .where("date", ">=", signalsBaselineStart)
    .where("date", "<", dayKey)
    .get();
  const healthScoreHistory = healthScoreHistorySnap.docs.map((d) => d.data() as HealthScoreDocForSignals);

  const healthScoreForSignals: HealthScoreDocForSignals = {
    date: healthScoreDoc.date,
    compositeScore: healthScoreDoc.compositeScore,
    domainScores: {
      recovery: { score: healthScoreDoc.domainScores.recovery.score },
      training: { score: healthScoreDoc.domainScores.training.score },
      nutrition: { score: healthScoreDoc.domainScores.nutrition.score },
      body: { score: healthScoreDoc.domainScores.body.score },
    },
  };
  const healthSignalsDoc = computeHealthSignalsV1({
    dayKey,
    healthScoreForDay: healthScoreForSignals,
    healthScoreHistory,
    computedAt,
    pipelineVersion: 1,
    thresholds: SIGNAL_THRESHOLDS,
  });
  await writeHealthSignalsImmutable({
    db,
    userId,
    dayKey,
    doc: healthSignalsDoc,
  });

  const runIdSeed =
    trigger.type === "factOnly"
      ? `factOnly_${trigger.rawEventId}_${dayKey}`
      : trigger.type === "realtime"
        ? `onCanonicalEventCreated_${trigger.eventId}_${dayKey}`
        : `admin_${trigger.source}_${dayKey}`;

  const runId = makeLedgerRunIdFromSeed("rt", runIdSeed);

  await writeDerivedLedgerRun({
    db,
    userId,
    date: dayKey,
    runId,
    computedAt,
    pipelineVersion: 1,
    trigger:
      trigger.type === "factOnly"
        ? { type: "realtime", name: "onRawEventCreated_factOnly", eventId: trigger.rawEventId }
        : trigger.type === "realtime"
          ? { type: "realtime", name: "onCanonicalEventCreated", eventId: trigger.eventId }
          : { type: "scheduled", name: trigger.source, eventId: runId },
    ...(latestCanonicalEventAt ? { latestCanonicalEventAt } : {}),
    dailyFacts: dailyFactsWithMeta as unknown as object,
    intelligenceContext: ctxWithMeta as unknown as object,
    insights: insights as unknown as object[],
    healthScore: healthScoreDoc as unknown as object,
    healthSignals: healthSignalsDoc as unknown as object,
  });
}
