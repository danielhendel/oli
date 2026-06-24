// lib/data/health-baseline/buildHealthBaseline.ts
/**
 * Pure, deterministic Health Baseline builder.
 * Summarizes current measured reality — no AI, no recommendations, no goals.
 */
import type { HealthBaselineInput } from "@/lib/data/health-baseline/healthBaselineInput";
import {
  classifyCategoryStatus,
  computeBaselineConfidence,
  computeDataCompleteness,
  daysSinceIso,
  formatKg,
  formatKgAsLbs,
} from "@/lib/data/health-baseline/scoring";
import type {
  ActivityBaseline,
  BaselineMetric,
  BodyCompositionBaseline,
  CardioBaseline,
  HealthBaseline,
  LabsBaseline,
  NutritionBaseline,
  RecoveryBaseline,
  StrengthBaseline,
} from "@/lib/data/health-baseline/types";

function metric(key: string, label: string, value: string | null, available: boolean): BaselineMetric {
  return { key, label, value, available };
}

function buildBodyCompositionBaseline(input: HealthBaselineInput): BodyCompositionBaseline {
  const { body } = input;
  const metrics: BaselineMetric[] = [];

  const weightDisplay =
    body.weightKg != null && Number.isFinite(body.weightKg)
      ? `${formatKgAsLbs(body.weightKg)} (${formatKg(body.weightKg)})`
      : null;
  metrics.push(metric("weight", "Weight", weightDisplay, weightDisplay != null));

  const bodyFatDisplay =
    body.bodyFatPercent != null && Number.isFinite(body.bodyFatPercent)
      ? `${body.bodyFatPercent.toFixed(1)}%`
      : null;
  metrics.push(metric("body-fat", "Body fat", bodyFatDisplay, bodyFatDisplay != null));

  const leanDisplay =
    body.leanMassKg != null && Number.isFinite(body.leanMassKg) ? formatKg(body.leanMassKg) : null;
  metrics.push(metric("lean-mass", "Lean mass", leanDisplay, leanDisplay != null));

  metrics.push(metric("waist", "Waist", null, false));

  const bmiDisplay = body.bmi != null && Number.isFinite(body.bmi) ? body.bmi.toFixed(1) : null;
  metrics.push(metric("bmi", "BMI", bmiDisplay, bmiDisplay != null));

  let weightClassification: string | null = null;
  if (body.weightBaselineModel?.kind === "ready") {
    weightClassification = body.weightBaselineModel.classification;
    metrics.push(
      metric(
        "weight-trend",
        "90-day weight trend",
        weightClassification.charAt(0).toUpperCase() + weightClassification.slice(1),
        true,
      ),
    );
  }

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, weightDisplay != null);

  return {
    status,
    weightKg: body.weightKg,
    bodyFatPercent: body.bodyFatPercent,
    leanMassKg: body.leanMassKg,
    waistCm: null,
    bmi: body.bmi,
    weightClassification,
    metrics,
  };
}

function buildActivityBaseline(input: HealthBaselineInput): ActivityBaseline {
  const { activity } = input;
  const metrics: BaselineMetric[] = [];

  const day90Row = activity.historyModel?.rows.find((r) => r.key === "day90") ?? null;
  const day7Row = activity.historyModel?.rows.find((r) => r.key === "day7") ?? null;

  const avgSteps = day90Row?.hasEnoughData ? day90Row.averageStepsPerDay : null;
  const stepsDisplay =
    avgSteps != null && Number.isFinite(avgSteps)
      ? `${Math.round(avgSteps).toLocaleString()} steps/day`
      : null;
  metrics.push(metric("steps", "Average daily steps (90d)", stepsDisplay, stepsDisplay != null));

  const activeMinutesDisplay =
    activity.activeMinutesToday != null && Number.isFinite(activity.activeMinutesToday)
      ? `${Math.round(activity.activeMinutesToday)} min`
      : null;
  metrics.push(
    metric("active-minutes", "Active minutes (today)", activeMinutesDisplay, activeMinutesDisplay != null),
  );

  const weeklyDisplay =
    day7Row?.hasEnoughData && day7Row.averageStepsPerDay != null
      ? `${Math.round(day7Row.averageStepsPerDay).toLocaleString()} steps/day (7d)`
      : null;
  metrics.push(metric("weekly-movement", "Recent weekly movement", weeklyDisplay, weeklyDisplay != null));

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, stepsDisplay != null);

  return {
    status,
    averageStepsPerDay: avgSteps,
    activeMinutesToday: activity.activeMinutesToday,
    weeklyMovementSummary: weeklyDisplay,
    metrics,
  };
}

function buildStrengthBaseline(input: HealthBaselineInput): StrengthBaseline {
  const { strength } = input;
  const model = strength.baselineModel;
  const metrics: BaselineMetric[] = [];

  metrics.push(metric("estimated-1rm", "Estimated 1RM", null, false));

  const freq = model?.avgWorkoutsPerWeek ?? null;
  const freqDisplay =
    freq != null && Number.isFinite(freq) ? `${freq.toFixed(1)} sessions/week` : null;
  metrics.push(metric("frequency", "Training frequency", freqDisplay, freqDisplay != null));

  const volumeMin = model?.avgMinutesPerWeek ?? null;
  const volumeDisplay =
    volumeMin != null && Number.isFinite(volumeMin)
      ? `${Math.round(volumeMin)} min/week`
      : null;
  metrics.push(metric("volume", "Weekly training volume", volumeDisplay, volumeDisplay != null));

  const consistencyLabel = model?.ratingLabel ?? null;
  metrics.push(
    metric("consistency", "Recent consistency", consistencyLabel, consistencyLabel != null),
  );

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, freqDisplay != null);

  return {
    status,
    estimatedOneRmKg: null,
    trainingFrequencyPerWeek: freq,
    weeklyVolumeMinutes: volumeMin,
    consistencyLabel,
    metrics,
  };
}

function buildCardioBaseline(input: HealthBaselineInput): CardioBaseline {
  const { cardio } = input;
  const model = cardio.baselineModel?.kind === "ready" ? cardio.baselineModel : null;
  const metrics: BaselineMetric[] = [];

  const rhrDisplay =
    cardio.restingHeartRateBpm != null && Number.isFinite(cardio.restingHeartRateBpm)
      ? `${Math.round(cardio.restingHeartRateBpm)} bpm`
      : null;
  metrics.push(metric("resting-hr", "Resting heart rate", rhrDisplay, rhrDisplay != null));

  const durationDisplay =
    model != null ? model.formattedAverageMinutesPerWeek : null;
  metrics.push(
    metric("duration", "Average cardio duration", durationDisplay, durationDisplay != null),
  );

  const distanceDisplay = model != null ? model.formattedAverageMilesPerWeek : null;
  metrics.push(metric("distance", "Weekly distance", distanceDisplay, distanceDisplay != null));

  const paceDisplay =
    cardio.paceMinPerKm != null && Number.isFinite(cardio.paceMinPerKm)
      ? `${cardio.paceMinPerKm.toFixed(2)} min/km`
      : null;
  metrics.push(metric("pace", "Recent pace", paceDisplay, paceDisplay != null));

  metrics.push(metric("vo2", "VO₂ estimate", null, false));

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, distanceDisplay != null || durationDisplay != null);

  return {
    status,
    restingHeartRateBpm: cardio.restingHeartRateBpm,
    averageDurationMinutesPerWeek: model?.averageMinutesPerWeek90d ?? null,
    averageDistanceMilesPerWeek: model?.averageMilesPerWeek90d ?? null,
    averagePaceMinPerKm: cardio.paceMinPerKm,
    vo2Estimate: null,
    metrics,
  };
}

function buildNutritionBaseline(input: HealthBaselineInput): NutritionBaseline {
  const { nutrition } = input;
  const metrics: BaselineMetric[] = [];

  const day90Row = nutrition.baselineModel?.rows.find((r) => r.key === "day90") ?? null;
  const macros = nutrition.macroTotals90d;

  const kcalFromRow = day90Row?.avgKcalPerDay ?? null;
  const kcalFromMacros =
    macros?.hasData && macros.totalKcal > 0
      ? macros.totalKcal / 90
      : null;
  const avgKcal = kcalFromRow ?? kcalFromMacros;
  const kcalDisplay =
    avgKcal != null && Number.isFinite(avgKcal)
      ? `${Math.round(avgKcal).toLocaleString()} kcal/day`
      : null;
  metrics.push(metric("calories", "Average calories", kcalDisplay, kcalDisplay != null));

  const proteinAvg =
    macros?.hasData && macros.proteinG > 0 ? macros.proteinG / 90 : null;
  const proteinDisplay =
    proteinAvg != null && Number.isFinite(proteinAvg)
      ? `${Math.round(proteinAvg)} g/day`
      : null;
  metrics.push(metric("protein", "Average protein", proteinDisplay, proteinDisplay != null));

  const carbsAvg = macros?.hasData && macros.carbsG > 0 ? macros.carbsG / 90 : null;
  const carbsDisplay =
    carbsAvg != null && Number.isFinite(carbsAvg) ? `${Math.round(carbsAvg)} g/day` : null;
  metrics.push(metric("carbs", "Average carbs", carbsDisplay, carbsDisplay != null));

  const fatAvg = macros?.hasData && macros.fatG > 0 ? macros.fatG / 90 : null;
  const fatDisplay = fatAvg != null && Number.isFinite(fatAvg) ? `${Math.round(fatAvg)} g/day` : null;
  metrics.push(metric("fat", "Average fat", fatDisplay, fatDisplay != null));

  const logging = day90Row?.avgDaysLoggedPerWeek ?? null;
  const loggingDisplay =
    logging != null && Number.isFinite(logging) ? `${logging.toFixed(1)} days/week` : null;
  metrics.push(
    metric("logging", "Logging consistency", loggingDisplay, loggingDisplay != null),
  );

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, kcalDisplay != null || loggingDisplay != null);

  return {
    status,
    averageCaloriesPerDay: avgKcal,
    averageProteinG: proteinAvg,
    averageCarbsG: carbsAvg,
    averageFatG: fatAvg,
    loggingConsistencyDaysPerWeek: logging,
    metrics,
  };
}

function buildRecoveryBaseline(input: HealthBaselineInput): RecoveryBaseline {
  const { recovery } = input;
  const metrics: BaselineMetric[] = [];

  const day90Row = recovery.sleepBaselineVm?.rows.find((r) => r.key === "day90") ?? null;
  const sleepMinutes = day90Row?.hasEnoughData ? day90Row.averageMinutes : null;
  const sleepDisplay =
    sleepMinutes != null && Number.isFinite(sleepMinutes)
      ? day90Row?.displayValue ?? `${(sleepMinutes / 60).toFixed(1)} h/night`
      : null;
  metrics.push(metric("sleep-duration", "Sleep duration (90d)", sleepDisplay, sleepDisplay != null));

  const sleepConsistency =
    day90Row?.hasEnoughData && day90Row.statusLabel != null ? day90Row.statusLabel : null;
  metrics.push(
    metric("sleep-consistency", "Sleep consistency", sleepConsistency, sleepConsistency != null),
  );

  const hrvDisplay =
    recovery.hrvRmssd != null && Number.isFinite(recovery.hrvRmssd)
      ? `${Math.round(recovery.hrvRmssd)} ms`
      : null;
  metrics.push(metric("hrv", "HRV (RMSSD)", hrvDisplay, hrvDisplay != null));

  const rhrDisplay =
    recovery.restingHeartRateBpm != null && Number.isFinite(recovery.restingHeartRateBpm)
      ? `${Math.round(recovery.restingHeartRateBpm)} bpm`
      : null;
  metrics.push(metric("resting-hr", "Resting heart rate", rhrDisplay, rhrDisplay != null));

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, sleepDisplay != null);

  return {
    status,
    sleepDurationMinutes: sleepMinutes,
    sleepConsistencyLabel: sleepConsistency,
    hrvRmssd: recovery.hrvRmssd,
    restingHeartRateBpm: recovery.restingHeartRateBpm,
    metrics,
  };
}

function buildLabsBaseline(input: HealthBaselineInput, nowMs: number): LabsBaseline {
  const summary = input.labs.summary;
  const metrics: BaselineMetric[] = [];

  if (summary == null || summary.uploadCount === 0) {
    metrics.push(metric("labs-available", "Recent labs", "No labs on file", false));
    metrics.push(metric("lab-recency", "Lab recency", null, false));
    metrics.push(metric("biomarkers", "Available biomarkers", "0", false));

    return {
      status: "missing",
      latestLabsAvailable: false,
      labRecencyDays: null,
      biomarkerCount: 0,
      availableBiomarkers: [],
      metrics,
    };
  }

  const biomarkers: string[] = [];
  let latestCollectedAt: string | null = null;

  for (const category of summary.categories) {
    for (const m of category.metrics) {
      biomarkers.push(m.displayName);
      if (m.collectedAt != null) {
        if (latestCollectedAt == null || m.collectedAt > latestCollectedAt) {
          latestCollectedAt = m.collectedAt;
        }
      }
    }
  }

  const recencyDays = daysSinceIso(latestCollectedAt, nowMs);
  const recencyDisplay =
    recencyDays != null ? (recencyDays === 0 ? "Today" : `${recencyDays} days ago`) : "Unknown";

  metrics.push(metric("labs-available", "Recent labs", "Available", true));
  metrics.push(metric("lab-recency", "Lab recency", recencyDisplay, recencyDays != null));
  metrics.push(
    metric(
      "biomarkers",
      "Available biomarkers",
      `${biomarkers.length}`,
      biomarkers.length > 0,
    ),
  );

  const availableCount = metrics.filter((m) => m.available).length;
  const status = classifyCategoryStatus(availableCount, biomarkers.length > 0);

  return {
    status,
    latestLabsAvailable: biomarkers.length > 0,
    labRecencyDays: recencyDays,
    biomarkerCount: biomarkers.length,
    availableBiomarkers: biomarkers.slice(0, 12),
    metrics,
  };
}

export function buildHealthBaseline(input: HealthBaselineInput): HealthBaseline {
  const nowMs = input.generatedAt != null ? Date.parse(input.generatedAt) : Date.now();
  const generatedAt = input.generatedAt ?? new Date(nowMs).toISOString();

  const partial: Omit<HealthBaseline, "dataCompleteness" | "baselineConfidence"> = {
    bodyComposition: buildBodyCompositionBaseline(input),
    activity: buildActivityBaseline(input),
    strength: buildStrengthBaseline(input),
    cardio: buildCardioBaseline(input),
    nutrition: buildNutritionBaseline(input),
    recovery: buildRecoveryBaseline(input),
    labs: buildLabsBaseline(input, nowMs),
    generatedAt,
  };

  const dataCompleteness = computeDataCompleteness(partial);
  const baselineConfidence = computeBaselineConfidence(partial, dataCompleteness);

  return {
    ...partial,
    dataCompleteness,
    baselineConfidence,
  };
}
