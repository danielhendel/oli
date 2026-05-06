import type { Firestore } from "firebase-admin/firestore";
import type { DailyEnergyFacts, DailyFacts } from "../types/health";
import { computeDailyEnergyV1 } from "./computeDailyEnergyV1";

const LOOKBACK_DAYS = 90;

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

export async function resolveDailyEnergyForFactsV1(input: {
  db: Firestore;
  userId: string;
  dailyFacts: DailyFacts;
}): Promise<DailyEnergyFacts | undefined> {
  const { db, userId, dailyFacts } = input;
  const userRef = db.collection("users").doc(userId);

  const profileMainSnap = await userRef.collection("profile").doc("main").get();
  const profileMainRaw = (profileMainSnap.exists ? profileMainSnap.data() : undefined) as
    | {
        identity?: { dateOfBirth?: string | null; sexAtBirth?: string | null };
        body?: { heightCm?: number | null };
      }
    | undefined;
  const profileForEnergy = {
    ...(typeof profileMainRaw?.identity?.dateOfBirth === "string"
      ? { dateOfBirth: profileMainRaw.identity.dateOfBirth }
      : {}),
    ...(typeof profileMainRaw?.identity?.sexAtBirth === "string"
      ? { sexAtBirth: profileMainRaw.identity.sexAtBirth }
      : {}),
    ...(typeof profileMainRaw?.body?.heightCm === "number" ? { heightCm: profileMainRaw.body.heightCm } : {}),
  };

  const latestBodyDayStart = addDaysUtc(dailyFacts.date, -LOOKBACK_DAYS);
  const priorFactsSnap = await userRef
    .collection("dailyFacts")
    .where("date", ">=", latestBodyDayStart)
    .where("date", "<", dailyFacts.date)
    .orderBy("date", "desc")
    .limit(LOOKBACK_DAYS)
    .get();

  const latestBodyFactsSource = priorFactsSnap.docs
    .map((d) => d.data() as DailyFacts)
    .find((f) => {
      const body = f.body;
      return (
        typeof body?.weightKg === "number" ||
        typeof body?.bodyFatPercent === "number" ||
        typeof body?.leanBodyMassKg === "number" ||
        typeof body?.restingMetabolicRateKcal === "number"
      );
    });

  const latestBodyFactsForEnergy = latestBodyFactsSource?.body
    ? {
        ...(typeof latestBodyFactsSource.body.weightKg === "number"
          ? { weightKg: latestBodyFactsSource.body.weightKg }
          : {}),
        ...(typeof latestBodyFactsSource.body.bodyFatPercent === "number"
          ? { bodyFatPercent: latestBodyFactsSource.body.bodyFatPercent }
          : {}),
        ...(typeof latestBodyFactsSource.body.leanBodyMassKg === "number"
          ? { leanBodyMassKg: latestBodyFactsSource.body.leanBodyMassKg }
          : {}),
        ...(typeof latestBodyFactsSource.body.restingMetabolicRateKcal === "number"
          ? { restingMetabolicRateKcal: latestBodyFactsSource.body.restingMetabolicRateKcal }
          : {}),
        sourceDay: latestBodyFactsSource.date,
        isCarriedForward: true as const,
      }
    : undefined;

  return computeDailyEnergyV1({
    dailyFacts,
    ...(Object.keys(profileForEnergy).length > 0 ? { profile: profileForEnergy } : {}),
    ...(latestBodyFactsForEnergy ? { latestBodyFacts: latestBodyFactsForEnergy } : {}),
  });
}
