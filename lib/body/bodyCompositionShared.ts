// lib/body/bodyCompositionShared.ts
// Pure helpers shared by interpretation copy + bar quality (no UI).
import type { ProfileSexAtBirth } from "@oli/contracts";

export const LB_PER_KG = 2.2046226218;

export type MassDisplayUnit = "kg" | "lb";

/** Healthy-weight band from BMI 18.5–24.9 (kg) for height (cm). */
export function healthyWeightBandKg(heightCm: number): { bandLo: number; bandHi: number } {
  const hM = heightCm / 100;
  return { bandLo: 18.5 * hM * hM, bandHi: 24.9 * hM * hM };
}

export function formatMassRangeForCopy(loKg: number, hiKg: number, unit: MassDisplayUnit): string {
  if (unit === "lb") {
    const a = loKg * LB_PER_KG;
    const b = hiKg * LB_PER_KG;
    return `${a.toFixed(1)}–${b.toFixed(1)} lb`;
  }
  return `${loKg.toFixed(1)}–${hiKg.toFixed(1)} kg`;
}

export function sexForBodyFatBands(sex: ProfileSexAtBirth | null): "male" | "female" | "unspecified" {
  if (sex === "male") return "male";
  if (sex === "female") return "female";
  return "unspecified";
}

/** Mirrors bodyCompositionInterpretation thresholds for bar scoring. */
export function bodyFatFitnessThresholds(
  sex: "male" | "female",
  athleteMode: boolean,
): { fitnessLo: number; fitnessHi: number; averageHi: number } {
  if (sex === "male") {
    return athleteMode
      ? { fitnessLo: 12, fitnessHi: 18, averageHi: 25 }
      : { fitnessLo: 14, fitnessHi: 17, averageHi: 24 };
  }
  return athleteMode
    ? { fitnessLo: 18, fitnessHi: 26, averageHi: 32 }
    : { fitnessLo: 21, fitnessHi: 24, averageHi: 31 };
}

/** Calendar age in years; null if DOB missing/invalid or outside 2–120 (adult estimate guard). */
export function ageYearsFromProfileDateOfBirth(dob: string | null, ref: Date = new Date()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const parts = dob.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  if (!y || !m || !d) return null;
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const dm = today.getMonth() - birth.getMonth();
  if (dm < 0 || (dm === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 2 || age > 120) return null;
  return age;
}

/**
 * Mifflin–St Jeor BMR (kcal/day). Intersex/unspecified averages male and female formulas.
 */
export function mifflinStJeorBmrKcalPerDay(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: ProfileSexAtBirth | null;
}): number {
  const { weightKg, heightCm, ageYears } = input;
  const w = weightKg;
  const h = heightCm;
  const a = ageYears;
  const men = 10 * w + 6.25 * h - 5 * a + 5;
  const women = 10 * w + 6.25 * h - 5 * a - 161;
  const s = input.sex;
  if (s === "male") return men;
  if (s === "female") return women;
  return (men + women) / 2;
}
