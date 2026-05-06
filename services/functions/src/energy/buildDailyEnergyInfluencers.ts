import type { DailyEnergyInfluencers, DailyFacts } from "../types/health";

const round1 = (v: number): number => Math.round(v * 10) / 10;

export function buildDailyEnergyInfluencersFromFacts(
  dailyFacts: DailyFacts,
): DailyEnergyInfluencers | undefined {
  const movement = dailyFacts.activity
    ? {
        ...(typeof dailyFacts.activity.steps === "number"
          ? { steps: dailyFacts.activity.steps }
          : {}),
        ...(typeof dailyFacts.activity.distanceKm === "number"
          ? { distanceMeters: round1(dailyFacts.activity.distanceKm * 1000) }
          : {}),
      }
    : undefined;

  const cardio = dailyFacts.cardio
    ? {
        ...(typeof dailyFacts.cardio.durationMinutes === "number"
          ? { durationMinutes: dailyFacts.cardio.durationMinutes }
          : {}),
        ...(typeof dailyFacts.cardio.distanceMeters === "number"
          ? { distanceMeters: dailyFacts.cardio.distanceMeters }
          : {}),
        ...(typeof dailyFacts.cardio.primarySport === "string"
          ? { sport: dailyFacts.cardio.primarySport }
          : {}),
      }
    : undefined;

  const strengthDensity =
    typeof dailyFacts.strength?.volumeKg === "number" &&
    typeof dailyFacts.strength?.durationMinutes === "number" &&
    dailyFacts.strength.durationMinutes > 0
      ? round1(dailyFacts.strength.volumeKg / dailyFacts.strength.durationMinutes)
      : undefined;
  const strength = dailyFacts.strength
    ? {
        ...(typeof dailyFacts.strength.durationMinutes === "number"
          ? { durationMinutes: dailyFacts.strength.durationMinutes }
          : {}),
        ...(typeof dailyFacts.strength.volumeKg === "number"
          ? { volumeKg: dailyFacts.strength.volumeKg }
          : {}),
        ...(typeof dailyFacts.strength.totalSets === "number"
          ? { sets: dailyFacts.strength.totalSets }
          : {}),
        ...(typeof dailyFacts.strength.totalReps === "number"
          ? { reps: dailyFacts.strength.totalReps }
          : {}),
        ...(typeof dailyFacts.strength.primarySport === "string"
          ? { sport: dailyFacts.strength.primarySport }
          : {}),
        ...(typeof dailyFacts.strength.averageHeartRateBpm === "number"
          ? { averageHeartRateBpm: dailyFacts.strength.averageHeartRateBpm }
          : {}),
        ...(typeof dailyFacts.strength.maxHeartRateBpm === "number"
          ? { maxHeartRateBpm: dailyFacts.strength.maxHeartRateBpm }
          : {}),
        ...(typeof strengthDensity === "number" ? { densityKgPerMinute: strengthDensity } : {}),
      }
    : undefined;

  const physiology =
    dailyFacts.recovery && (dailyFacts.recovery.hrvRmssd != null || dailyFacts.recovery.restingHeartRate != null)
      ? {
          ...(typeof dailyFacts.recovery.restingHeartRate === "number"
            ? { restingHeartRateBpm: dailyFacts.recovery.restingHeartRate }
            : {}),
          ...(typeof dailyFacts.recovery.hrvRmssd === "number"
            ? { hrvRmssdMs: dailyFacts.recovery.hrvRmssd }
            : {}),
        }
      : undefined;

  const out: DailyEnergyInfluencers = {};
  if (movement && Object.keys(movement).length > 0) out.movement = movement;
  if (cardio && Object.keys(cardio).length > 0) out.cardio = cardio;
  if (strength && Object.keys(strength).length > 0) out.strength = strength;
  if (physiology && Object.keys(physiology).length > 0) out.physiology = physiology;
  return Object.keys(out).length > 0 ? out : undefined;
}
