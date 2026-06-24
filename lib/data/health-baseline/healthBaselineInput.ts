// lib/data/health-baseline/healthBaselineInput.ts
/**
 * Resolved inputs for the pure Health Baseline builder.
 * Populated by useHealthBaseline — no network calls in buildHealthBaseline.
 */
import type { LabsSummaryResponseDto } from "@/lib/contracts";
import type { ActivityHistorySummaryModel } from "@/lib/data/activity/activityHistorySummaryModel";
import type { WeightBaselineCardModel } from "@/lib/data/body/weightBaselineCardModel";
import type { NutritionBaselineModel } from "@/lib/data/nutrition/nutritionBaselineModel";
import type { NutritionDayMacroTotals } from "@/lib/data/nutrition/nutritionFactsAggregate";
import type { SleepBaselineVm } from "@/lib/data/sleep/buildSleepBaselineVm";
import type { CardioBaselineCardModel } from "@/lib/data/workouts/cardioBaselineCardModel";
import type { StrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import type { DayKey } from "@/lib/ui/calendar/types";

export type HealthBaselineBodyInput = {
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  bmi: number | null;
  weightBaselineModel: WeightBaselineCardModel | null;
};

export type HealthBaselineActivityInput = {
  historyModel: ActivityHistorySummaryModel | null;
  activeMinutesToday: number | null;
};

export type HealthBaselineStrengthInput = {
  baselineModel: StrengthBaselineCardModel | null;
};

export type HealthBaselineCardioInput = {
  baselineModel: CardioBaselineCardModel | null;
  restingHeartRateBpm: number | null;
  paceMinPerKm: number | null;
};

export type HealthBaselineNutritionInput = {
  baselineModel: NutritionBaselineModel | null;
  macroTotals90d: NutritionDayMacroTotals | null;
};

export type HealthBaselineRecoveryInput = {
  sleepBaselineVm: SleepBaselineVm | null;
  hrvRmssd: number | null;
  restingHeartRateBpm: number | null;
};

export type HealthBaselineLabsInput = {
  summary: LabsSummaryResponseDto | null;
};

export type HealthBaselineInput = {
  todayDayKey: DayKey;
  body: HealthBaselineBodyInput;
  activity: HealthBaselineActivityInput;
  strength: HealthBaselineStrengthInput;
  cardio: HealthBaselineCardioInput;
  nutrition: HealthBaselineNutritionInput;
  recovery: HealthBaselineRecoveryInput;
  labs: HealthBaselineLabsInput;
  generatedAt?: string;
};
