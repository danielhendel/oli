// services/functions/src/dailyFacts/loadBodyFactsFromRawForDay.ts

/**
 * Load all body-capable raw events for a user+day, then resolve body facts using
 * preferences.metricSources (source-aware aggregation for weight and body_fat_percent).
 * Used by recomputeForDay, admin HTTP recompute, and scheduled daily facts job.
 */

import type { Firestore } from "firebase-admin/firestore";
import type { DailyBodyFacts, YmdDateString } from "../types/health";
import {
  selectBodyFactsForDay,
  type BodyRawEventForDay,
} from "./selectBodyFactsForDay";

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

/**
 * Derive dayKey from weight payload (time + timezone).
 * Must match extractFactOnlyContext in onRawEventCreated (Intl en-CA).
 */
function deriveDayFromWeightPayload(
  payload: Record<string, unknown> | undefined,
): YmdDateString | null {
  if (!payload || typeof payload["time"] !== "string" || typeof payload["timezone"] !== "string")
    return null;
  try {
    const d = new Date(payload["time"] as string);
    if (Number.isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: payload["timezone"] as string });
    return fmt.format(d) as YmdDateString;
  } catch {
    return null;
  }
}

/**
 * Parse one body-capable raw doc into BodyRawEventForDay if valid for the target day.
 */
function parseWeightRawDoc(
  data: Record<string, unknown>,
  targetDayKey: YmdDateString,
): BodyRawEventForDay | null {
  const kind = data["kind"];
  if (kind !== "weight" && kind !== "body_composition") return null;
  const observedAt = data["observedAt"];
  const sourceId = data["sourceId"];
  if (typeof observedAt !== "string" || typeof sourceId !== "string") return null;

  const payload = data["payload"] as Record<string, unknown> | undefined;
  const dayKey = deriveDayFromWeightPayload(payload);
  if (dayKey !== targetDayKey) return null;

  const weightKg = payload?.["weightKg"];
  const bodyFatPercent = payload?.["bodyFatPercent"];
  const bmi = payload?.["bmi"];
  const leanBodyMassKg = payload?.["leanBodyMassKg"];
  const restingMetabolicRateKcal = payload?.["restingMetabolicRateKcal"];
  const w =
    typeof weightKg === "number" && Number.isFinite(weightKg) && weightKg > 0 ? weightKg : undefined;
  const bf =
    typeof bodyFatPercent === "number" &&
    Number.isFinite(bodyFatPercent) &&
    bodyFatPercent >= 0 &&
    bodyFatPercent <= 100
      ? bodyFatPercent
      : undefined;
  const bmiValue =
    typeof bmi === "number" && Number.isFinite(bmi) && bmi > 0 && bmi < 100 ? bmi : undefined;
  const leanValue =
    typeof leanBodyMassKg === "number" && Number.isFinite(leanBodyMassKg) && leanBodyMassKg > 0
      ? leanBodyMassKg
      : undefined;
  const rmrValue =
    typeof restingMetabolicRateKcal === "number" &&
    Number.isFinite(restingMetabolicRateKcal) &&
    restingMetabolicRateKcal > 0
      ? restingMetabolicRateKcal
      : undefined;
  if (w === undefined && bf === undefined && bmiValue === undefined && leanValue === undefined && rmrValue === undefined)
    return null;

  return {
    observedAt,
    sourceId,
    ...(w !== undefined ? { weightKg: w } : {}),
    ...(bf !== undefined ? { bodyFatPercent: bf } : {}),
    ...(bmiValue !== undefined ? { bmi: bmiValue } : {}),
    ...(leanValue !== undefined ? { leanBodyMassKg: leanValue } : {}),
    ...(rmrValue !== undefined ? { restingMetabolicRateKcal: rmrValue } : {}),
  };
}

/**
 * Load body facts for a user+day from raw body events and preferences.
 * Queries rawEvents by kind in [weight, body_composition] and observedAt in a range
 * that covers the calendar day in any timezone.
 */
export async function loadBodyFactsFromRawForDay(
  db: Firestore,
  userId: string,
  dayKey: YmdDateString,
): Promise<DailyBodyFacts | undefined> {
  const userRef = db.collection("users").doc(userId);

  const startIso = `${addDaysUtc(dayKey, -1)}T00:00:00.000Z`;
  const endIso = `${addDaysUtc(dayKey, 2)}T23:59:59.999Z`;

  const rawSnap = await userRef
    .collection("rawEvents")
    .where("kind", "in", ["weight", "body_composition"])
    .where("observedAt", ">=", startIso)
    .where("observedAt", "<=", endIso)
    .get();

  const bodyEvents: BodyRawEventForDay[] = [];
  for (const doc of rawSnap.docs) {
    const parsed = parseWeightRawDoc(doc.data() as Record<string, unknown>, dayKey);
    if (parsed) bodyEvents.push(parsed);
  }

  const userSnap = await userRef.get();
  const prefs = (userSnap.data() as Record<string, unknown> | undefined)?.["preferences"] as
    | Record<string, unknown>
    | undefined;
  const metricSources = prefs?.["metricSources"] as Record<string, string> | undefined;

  return selectBodyFactsForDay(bodyEvents, metricSources);
}
