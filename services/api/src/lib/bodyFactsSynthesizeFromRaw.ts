/**
 * When users/me/dailyFacts/{day} is missing, synthesize `body` from raw weight/body_composition
 * events using the same rules as Cloud Functions (loadBodyFactsFromRawForDay + selectBodyFactsForDay).
 * Read-only; does not write Firestore.
 */

import { userCollection, userDoc } from "../db";
import { ymdInTimeZoneFromIso } from "./dayKey";
import {
  selectBodyFactsForDayFromRaw,
  type BodyRawEventForDay,
  type DailyBodyFactsSynthesized,
} from "./bodyFactsSelectionPure";

export type { BodyRawEventForDay, DailyBodyFactsSynthesized };
export { selectBodyFactsForDayFromRaw } from "./bodyFactsSelectionPure";

const parseIntStrict = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseYmdUtc = (ymd: string): Date => {
  const parts = ymd.split("-");
  if (parts.length !== 3) throw new Error(`Invalid YmdDateString: "${ymd}"`);
  const y = parseIntStrict(parts[0] ?? "");
  const m = parseIntStrict(parts[1] ?? "");
  const d = parseIntStrict(parts[2] ?? "");
  if (y === null || m === null || d === null) throw new Error(`Invalid YmdDateString: "${ymd}"`);
  return new Date(Date.UTC(y, m - 1, d));
};

const addDaysUtc = (ymd: string, deltaDays: number): string => {
  const base = parseYmdUtc(ymd);
  const next = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  const yy = next.getUTCFullYear();
  const mm = (next.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = next.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

function deriveDayFromWeightPayload(payload: Record<string, unknown> | undefined): string | null {
  if (!payload || typeof payload["time"] !== "string" || typeof payload["timezone"] !== "string")
    return null;
  const d = new Date(payload["time"] as string);
  if (Number.isNaN(d.getTime())) return null;
  return ymdInTimeZoneFromIso(payload["time"] as string, payload["timezone"] as string);
}

function parseWeightRawDoc(data: Record<string, unknown>, targetDayKey: string): BodyRawEventForDay | null {
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
 * Load body metrics for `dayKey` from rawEvents (same window + parsing as Functions).
 */
export async function loadBodyFactsFromRawForApi(uid: string, dayKey: string): Promise<DailyBodyFactsSynthesized | undefined> {
  const startIso = `${addDaysUtc(dayKey, -1)}T00:00:00.000Z`;
  const endIso = `${addDaysUtc(dayKey, 2)}T23:59:59.999Z`;

  const rawSnap = await userCollection(uid, "rawEvents")
    .where("kind", "in", ["weight", "body_composition"])
    .where("observedAt", ">=", startIso)
    .where("observedAt", "<=", endIso)
    .get();

  const bodyEvents: BodyRawEventForDay[] = [];
  for (const doc of rawSnap.docs) {
    const parsed = parseWeightRawDoc(doc.data() as Record<string, unknown>, dayKey);
    if (parsed) bodyEvents.push(parsed);
  }

  const userSnap = await userDoc(uid).get();
  const prefs = (userSnap.data() as Record<string, unknown> | undefined)?.["preferences"] as
    | Record<string, unknown>
    | undefined;
  const metricSources = prefs?.["metricSources"] as Record<string, string> | undefined;

  return selectBodyFactsForDayFromRaw(bodyEvents, metricSources);
}
