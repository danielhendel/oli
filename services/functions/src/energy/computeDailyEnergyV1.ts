import type {
  ActivityStepsAllocationV1,
  DailyActivityFacts,
  DailyEnergyFacts,
  DailyFacts,
  EnergyConfidence,
  EnergyFactor,
} from "../types/health";

type Input = {
  dailyFacts: DailyFacts;
  profile?: {
    dateOfBirth?: string;
    sexAtBirth?: string;
    heightCm?: number;
  };
  latestBodyFacts?: {
    weightKg?: number;
    bodyFatPercent?: number;
    leanBodyMassKg?: number;
    restingMetabolicRateKcal?: number;
    sourceDay?: string;
    isCarriedForward?: boolean;
  };
};

const MODEL_VERSION = "daily_energy_v3";

const LB_TO_KG_STRENGTH = 0.45359237;
const MIN_PLAUSIBLE_DAILY_RMR_KCAL = 800;
const MAX_PLAUSIBLE_DAILY_RMR_KCAL = 4000;

/** Strength training volume in kg from DailyFacts.strength (prefers rollup when present). */
function strengthVolumeKgKg(strength: DailyFacts["strength"]): number | undefined {
  if (!strength) return undefined;
  if (typeof strength.volumeKg === "number" && strength.volumeKg > 0) return strength.volumeKg;
  const lb = strength.totalVolumeByUnit?.lb ?? 0;
  const kg = strength.totalVolumeByUnit?.kg ?? 0;
  const total = kg + lb * LB_TO_KG_STRENGTH;
  return total > 0 ? round1(total) : undefined;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function isPhysiologicallyPlausibleDailyRmrKcal(v: unknown): v is number {
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  return v >= MIN_PLAUSIBLE_DAILY_RMR_KCAL && v <= MAX_PLAUSIBLE_DAILY_RMR_KCAL;
}

/** BMR midpoint uncertainty: tighter when lean mass is known (Katch–McArdle path). */
function bmrRangeFromMid(mid: number, tier: "lean_mass" | "standard"): { kcalLow: number; kcalHigh: number } {
  if (tier === "lean_mass") {
    return { kcalLow: round1(mid * 0.94), kcalHigh: round1(mid * 1.06) };
  }
  return { kcalLow: round1(mid * 0.92), kcalHigh: round1(mid * 1.1) };
}

/** NEAT (steps) midpoint uncertainty: tighter when walking distance is observed for the day. */
function neatRangeFromMid(mid: number, hasActivityDistance: boolean): { kcalLow: number; kcalHigh: number } {
  if (hasActivityDistance) {
    return { kcalLow: round1(mid * 0.9), kcalHigh: round1(mid * 1.1) };
  }
  return { kcalLow: round1(mid * 0.85), kcalHigh: round1(mid * 1.15) };
}

function roundPct(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function computeAgeYears(dateOfBirth: string, day: string): number | undefined {
  const dob = Date.parse(`${dateOfBirth}T00:00:00.000Z`);
  const ref = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(dob) || !Number.isFinite(ref) || ref < dob) return undefined;
  const years = (ref - dob) / (365.25 * 24 * 3600 * 1000);
  return Math.floor(years);
}

function confidenceFromCoverage(
  hasBaseline: boolean,
  hasSteps: boolean,
  hasCardio: boolean,
  hasStrength: boolean,
): EnergyConfidence {
  if (hasBaseline && hasSteps && (hasCardio || hasStrength)) return "high";
  if (hasBaseline && hasSteps) return "moderate";
  return "low";
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

/** ACSM-style approximation: kcal ≈ (MET × 3.5 × kg / 200) × minutes */
function kcalFromMetDuration(met: number, weightKg: number, durationMinutes: number): number {
  return round1(((met * 3.5 * weightKg) / 200) * durationMinutes);
}

function mergeRangeCardioFactors(a: EnergyFactor, b: EnergyFactor): EnergyFactor {
  const rank: Record<EnergyConfidence, number> = { low: 0, moderate: 1, high: 2 };
  const worse = (x: EnergyConfidence, y: EnergyConfidence): EnergyConfidence =>
    rank[x] < rank[y] ? x : y;
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    kcalLow: round1((a.kcalLow ?? 0) + (b.kcalLow ?? 0)),
    kcalHigh: round1((a.kcalHigh ?? 0) + (b.kcalHigh ?? 0)),
    confidence: worse(a.confidence, b.confidence),
    inputsUsed: uniq([...a.inputsUsed, ...b.inputsUsed]),
    inputsMissing: uniq([...a.inputsMissing, ...b.inputsMissing]),
  };
}

function cardioMetBandFromSportAndSpeed(args: {
  sport?: string;
  speedMetersPerSecond?: number;
}): { low: number; high: number } | null {
  const sport = (args.sport ?? "").toLowerCase();
  const speed = args.speedMetersPerSecond;
  if (!Number.isFinite(speed ?? NaN) || (speed ?? 0) <= 0) return null;
  if (sport.includes("run")) {
    if ((speed ?? 0) < 2.3) return { low: 6, high: 8 };
    if ((speed ?? 0) < 2.8) return { low: 8, high: 10 };
    return { low: 10, high: 12 };
  }
  if (sport.includes("walk") || sport.includes("hike")) {
    if ((speed ?? 0) < 1.4) return { low: 3.5, high: 4.8 };
    return { low: 4.5, high: 6.2 };
  }
  if (sport.includes("cycle") || sport.includes("bike")) {
    if ((speed ?? 0) < 5.5) return { low: 5.5, high: 7.5 };
    return { low: 7.5, high: 10 };
  }
  return { low: 5.5, high: 8.5 };
}

function tightenRangeByPercent(low: number, high: number, tightenPct: number): { low: number; high: number } {
  const mid = (low + high) / 2;
  const half = Math.max(0, (high - low) / 2);
  const tightened = half * Math.max(0, 1 - tightenPct);
  return { low: round1(mid - tightened), high: round1(mid + tightened) };
}

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * Resolve the step count used for NEAT energy (steps factor).
 *
 * Prefers {@link ActivityStepsAllocationV1.neatSteps} when the partition is present and the
 * invariant `neatSteps + strengthSteps + cardioSteps === activity.steps` holds (after integer
 * normalization). This prevents NEAT from double-counting steps already attributed to
 * cardio/strength workout windows by the Cardio/Strength factors.
 *
 * Falls back to {@link DailyActivityFacts.steps} when the allocation is missing or its
 * invariants are not satisfied (strict fail-closed for allocation; preserves prior behavior
 * for days without allocation, e.g. pre–Phase 2A history).
 *
 * Never mutates the input.
 */
export function resolveNeatStepsForEnergy(
  activity: DailyActivityFacts | undefined,
): { value: number; source: "allocation" | "total" } | undefined {
  if (!activity) return undefined;
  const totalSteps = activity.steps;
  const hasFiniteTotal = isFiniteNonNegative(totalSteps);

  const allocation: ActivityStepsAllocationV1 | undefined = activity.stepsAllocation;
  if (
    allocation &&
    isFiniteNonNegative(allocation.neatSteps) &&
    isFiniteNonNegative(allocation.strengthSteps) &&
    isFiniteNonNegative(allocation.cardioSteps) &&
    hasFiniteTotal
  ) {
    const neatInt = Math.round(allocation.neatSteps);
    const strengthInt = Math.round(allocation.strengthSteps);
    const cardioInt = Math.round(allocation.cardioSteps);
    const totalInt = Math.round(totalSteps as number);
    if (
      Number.isInteger(neatInt) &&
      Number.isInteger(strengthInt) &&
      Number.isInteger(cardioInt) &&
      Number.isInteger(totalInt) &&
      neatInt >= 0 &&
      strengthInt >= 0 &&
      cardioInt >= 0 &&
      totalInt >= 0 &&
      neatInt + strengthInt + cardioInt === totalInt
    ) {
      return { value: neatInt, source: "allocation" };
    }
  }

  if (hasFiniteTotal) {
    return { value: totalSteps as number, source: "total" };
  }
  return undefined;
}

export function computeDailyEnergyV1(input: Input): DailyEnergyFacts | undefined {
  const { dailyFacts, profile, latestBodyFacts } = input;
  const day = dailyFacts.date;
  const computedAt = dailyFacts.computedAt;

  const hasCurrentWeight = typeof dailyFacts.body?.weightKg === "number" && dailyFacts.body.weightKg > 0;
  const bodyWeightKg =
    hasCurrentWeight
      ? dailyFacts.body?.weightKg
      : typeof latestBodyFacts?.weightKg === "number" && latestBodyFacts.weightKg > 0
        ? latestBodyFacts.weightKg
        : undefined;
  const carriedWeight = !hasCurrentWeight && bodyWeightKg !== undefined && Boolean(latestBodyFacts?.isCarriedForward);
  const bodyFatPercent =
    typeof dailyFacts.body?.bodyFatPercent === "number"
      ? dailyFacts.body.bodyFatPercent
      : latestBodyFacts?.bodyFatPercent;
  const leanBodyMassKg =
    typeof dailyFacts.body?.leanBodyMassKg === "number"
      ? dailyFacts.body.leanBodyMassKg
      : latestBodyFacts?.leanBodyMassKg;
  const restingMetabolicRateKcal =
    typeof dailyFacts.body?.restingMetabolicRateKcal === "number"
      ? dailyFacts.body.restingMetabolicRateKcal
      : latestBodyFacts?.restingMetabolicRateKcal;
  const validatedDailyRmrKcal = isPhysiologicallyPlausibleDailyRmrKcal(restingMetabolicRateKcal)
    ? restingMetabolicRateKcal
    : undefined;

  const baselineInputsUsed: string[] = [];
  const baselineInputsMissing: string[] = [];
  if (typeof bodyWeightKg === "number" && bodyWeightKg > 0) {
    baselineInputsUsed.push(carriedWeight ? "body.weightKg:lastKnown" : "body.weightKg");
  } else baselineInputsMissing.push("body.weightKg");

  const heightCm = profile?.heightCm;
  if (typeof heightCm === "number" && heightCm > 0) baselineInputsUsed.push("profile.heightCm");
  else baselineInputsMissing.push("profile.heightCm");

  const sexAtBirth = typeof profile?.sexAtBirth === "string" ? profile.sexAtBirth.toLowerCase() : undefined;
  const sexNorm = sexAtBirth === "male" || sexAtBirth === "female" ? sexAtBirth : undefined;
  if (sexNorm) baselineInputsUsed.push("profile.sexAtBirth");
  else baselineInputsMissing.push("profile.sexAtBirth");

  const ageYears =
    typeof profile?.dateOfBirth === "string" ? computeAgeYears(profile.dateOfBirth, day) : undefined;
  if (typeof ageYears === "number" && ageYears > 0) baselineInputsUsed.push("profile.dateOfBirth");
  else baselineInputsMissing.push("profile.dateOfBirth");

  let baseline: EnergyFactor | undefined;
  const derivedLeanMassKg =
    typeof leanBodyMassKg === "number" && leanBodyMassKg > 0
      ? leanBodyMassKg
      : typeof bodyWeightKg === "number" &&
          bodyWeightKg > 0 &&
          typeof bodyFatPercent === "number" &&
          bodyFatPercent >= 0 &&
          bodyFatPercent <= 100
        ? bodyWeightKg * (1 - bodyFatPercent / 100)
        : undefined;
  if (typeof derivedLeanMassKg === "number" && derivedLeanMassKg > 0) {
    const mid = round1(370 + 21.6 * derivedLeanMassKg);
    const { kcalLow, kcalHigh } = bmrRangeFromMid(mid, "lean_mass");
    baseline = {
      kcalLow,
      kcalHigh,
      confidence: carriedWeight ? "moderate" : "high",
      inputsUsed: [
        ...baselineInputsUsed,
        ...(typeof leanBodyMassKg === "number" && leanBodyMassKg > 0
          ? ["body.leanBodyMassKg"]
          : ["body.bodyFatPercent"]),
      ],
      inputsMissing: baselineInputsMissing,
    };
  } else if (
    typeof bodyWeightKg === "number" &&
    bodyWeightKg > 0 &&
    typeof heightCm === "number" &&
    heightCm > 0 &&
    typeof ageYears === "number" &&
    ageYears > 0 &&
    sexNorm
  ) {
    const sexConst = sexNorm === "male" ? 5 : -161;
    const mid = round1(10 * bodyWeightKg + 6.25 * heightCm - 5 * ageYears + sexConst);
    const { kcalLow, kcalHigh } = bmrRangeFromMid(mid, "standard");
    baseline = {
      kcalLow,
      kcalHigh,
      confidence: carriedWeight ? "moderate" : "high",
      inputsUsed: baselineInputsUsed,
      inputsMissing: baselineInputsMissing,
    };
  } else if (typeof validatedDailyRmrKcal === "number") {
    const mid = round1(validatedDailyRmrKcal);
    const { kcalLow, kcalHigh } = bmrRangeFromMid(mid, "standard");
    baselineInputsUsed.push(
      latestBodyFacts?.isCarriedForward && !dailyFacts.body?.restingMetabolicRateKcal
        ? "body.restingMetabolicRateKcal:lastKnown"
        : "body.restingMetabolicRateKcal",
    );
    baseline = {
      kcalLow,
      kcalHigh,
      confidence: "moderate",
      inputsUsed: baselineInputsUsed,
      inputsMissing: baselineInputsMissing,
    };
  } else if (typeof bodyWeightKg === "number" && bodyWeightKg > 0) {
    const mid = round1(22 * bodyWeightKg);
    const { kcalLow, kcalHigh } = bmrRangeFromMid(mid, "standard");
    baseline = {
      kcalLow,
      kcalHigh,
      confidence: "low",
      inputsUsed: baselineInputsUsed,
      inputsMissing: baselineInputsMissing,
    };
  }

  const activityDistanceKm = dailyFacts.activity?.distanceKm;
  const hasActivityDistance =
    typeof activityDistanceKm === "number" && Number.isFinite(activityDistanceKm) && activityDistanceKm > 0;

  let stepsFactor: EnergyFactor | undefined;
  const resolvedNeat = resolveNeatStepsForEnergy(dailyFacts.activity);
  if (resolvedNeat !== undefined) {
    const neatSteps = resolvedNeat.value;
    const usingAllocation = resolvedNeat.source === "allocation";
    const stepsInputsUsed: string[] = [
      usingAllocation ? "activity.stepsAllocation.neatSteps" : "steps",
    ];
    const stepsInputsMissing: string[] = [];
    let kcalPerStep = 0.04;
    let confidence: EnergyConfidence = "moderate";
    if (typeof bodyWeightKg === "number" && bodyWeightKg > 0) {
      kcalPerStep = 0.0005 * bodyWeightKg + 0.01;
      stepsInputsUsed.push(carriedWeight ? "body.weightKg:lastKnown" : "body.weightKg");
      confidence = carriedWeight ? "moderate" : "high";
    } else {
      stepsInputsMissing.push("body.weightKg");
    }
    if (hasActivityDistance) {
      stepsInputsUsed.push("activity.distanceKm");
    }
    const stepsMid = round1(neatSteps * kcalPerStep);
    const { kcalLow, kcalHigh } = neatRangeFromMid(stepsMid, hasActivityDistance);
    stepsFactor = {
      kcalLow,
      kcalHigh,
      confidence,
      inputsUsed: stepsInputsUsed,
      inputsMissing: stepsInputsMissing,
    };
  }

  let cardioFromDuration: EnergyFactor | undefined;
  const cardioDurationMin = dailyFacts.cardio?.durationMinutes;
  if (
    typeof cardioDurationMin === "number" &&
    cardioDurationMin > 0 &&
    typeof bodyWeightKg === "number" &&
    bodyWeightKg > 0
  ) {
    let metLow = 5;
    let metHigh = 8;
    const distanceMeters = dailyFacts.cardio?.distanceMeters;
    const speedMetersPerSecond =
      typeof distanceMeters === "number" && distanceMeters > 0 && cardioDurationMin > 0
        ? distanceMeters / (cardioDurationMin * 60)
        : dailyFacts.cardio?.speedMetersPerSecond;
    const sportBand = cardioMetBandFromSportAndSpeed({
      ...(typeof dailyFacts.cardio?.primarySport === "string"
        ? { sport: dailyFacts.cardio.primarySport }
        : {}),
      ...(typeof speedMetersPerSecond === "number" ? { speedMetersPerSecond } : {}),
    });
    const cardioInputsUsed: string[] = [
      "cardio.durationMinutes",
      carriedWeight ? "body.weightKg:lastKnown" : "body.weightKg",
    ];
    if (sportBand) {
      metLow = sportBand.low;
      metHigh = sportBand.high;
      cardioInputsUsed.push("cardio.distanceMeters", "cardio.primarySport");
    }
    let low = kcalFromMetDuration(metLow, bodyWeightKg, cardioDurationMin);
    let high = kcalFromMetDuration(metHigh, bodyWeightKg, cardioDurationMin);
    let cardioConfidence: EnergyConfidence = carriedWeight ? "moderate" : "high";
    if (typeof dailyFacts.cardio?.averageHeartRateBpm === "number" && dailyFacts.cardio.averageHeartRateBpm > 0) {
      const tightened = tightenRangeByPercent(low, high, 0.12);
      low = tightened.low;
      high = tightened.high;
      cardioInputsUsed.push("cardio.averageHeartRateBpm");
      cardioConfidence = "high";
    }
    if (typeof dailyFacts.cardio?.maxHeartRateBpm === "number" && dailyFacts.cardio.maxHeartRateBpm > 0) {
      cardioInputsUsed.push("cardio.maxHeartRateBpm");
    }
    cardioFromDuration = {
      kcalLow: low,
      kcalHigh: high,
      confidence: cardioConfidence,
      inputsUsed: cardioInputsUsed,
      inputsMissing: [],
    };
  }

  let cardioFromLoad: EnergyFactor | undefined;
  const cardioTrainingLoad = dailyFacts.activity?.trainingLoad;
  if (typeof cardioTrainingLoad === "number" && cardioTrainingLoad > 0) {
    const low = round1(cardioTrainingLoad * 6);
    const high = round1(cardioTrainingLoad * 10);
    cardioFromLoad = {
      kcalLow: low,
      kcalHigh: high,
      confidence: "moderate",
      inputsUsed: ["trainingLoad"],
      inputsMissing: [],
    };
  }

  let cardio: EnergyFactor | undefined;
  if (cardioFromDuration && cardioFromLoad) {
    cardio = mergeRangeCardioFactors(cardioFromDuration, cardioFromLoad);
  } else {
    cardio = cardioFromDuration ?? cardioFromLoad;
  }

  let strength: EnergyFactor | undefined;
  const strengthFacts = dailyFacts.strength;
  const strengthDurationMin = strengthFacts?.durationMinutes;
  const strengthVolumeKg = strengthVolumeKgKg(strengthFacts);
  const workoutCount = strengthFacts?.workoutsCount;

  if (
    typeof strengthDurationMin === "number" &&
    strengthDurationMin > 0 &&
    typeof bodyWeightKg === "number" &&
    bodyWeightKg > 0
  ) {
    const metLow = 3.5;
    const metHigh = 6;
    strength = {
      kcalLow: kcalFromMetDuration(metLow, bodyWeightKg, strengthDurationMin),
      kcalHigh: kcalFromMetDuration(metHigh, bodyWeightKg, strengthDurationMin),
      confidence: carriedWeight ? "moderate" : "high",
      inputsUsed: [
        "strength.durationMinutes",
        carriedWeight ? "body.weightKg:lastKnown" : "body.weightKg",
      ],
      inputsMissing: [],
    };
  } else if (typeof strengthVolumeKg === "number" && strengthVolumeKg > 0) {
    strength = {
      kcalLow: round1(strengthVolumeKg * 0.03),
      kcalHigh: round1(strengthVolumeKg * 0.06),
      confidence: "moderate",
      inputsUsed: ["strength.volumeKg"],
      inputsMissing:
        typeof bodyWeightKg === "number" && bodyWeightKg > 0 ? [] : ["body.weightKg"],
    };
  } else if (typeof workoutCount === "number" && workoutCount > 0) {
    strength = {
      kcalLow: round1(workoutCount * 120),
      kcalHigh: round1(workoutCount * 220),
      confidence: "low",
      inputsUsed: ["strength.workoutsCount"],
      inputsMissing: ["strength.volumeKg", "strength.durationMinutes"],
    };
  }

  if (!baseline && !stepsFactor && !cardio && !strength) return undefined;

  const lowContrib: ["baseline" | "steps" | "cardio" | "strength", number][] = [];
  const highContrib: ["baseline" | "steps" | "cardio" | "strength", number][] = [];

  if (baseline) {
    lowContrib.push(["baseline", baseline.kcalLow ?? 0]);
    highContrib.push(["baseline", baseline.kcalHigh ?? baseline.kcalLow ?? 0]);
  }
  if (stepsFactor) {
    lowContrib.push(["steps", stepsFactor.kcalLow ?? 0]);
    highContrib.push(["steps", stepsFactor.kcalHigh ?? stepsFactor.kcalLow ?? 0]);
  }
  if (cardio) {
    lowContrib.push(["cardio", cardio.kcalLow ?? 0]);
    highContrib.push(["cardio", cardio.kcalHigh ?? cardio.kcalLow ?? 0]);
  }
  if (strength) {
    lowContrib.push(["strength", strength.kcalLow ?? 0]);
    highContrib.push(["strength", strength.kcalHigh ?? strength.kcalLow ?? 0]);
  }

  const totalLow = round1(sum(lowContrib.map(([, kcal]) => kcal)));
  const totalHigh = round1(sum(highContrib.map(([, kcal]) => kcal)));
  const midpoint = round1((totalLow + totalHigh) / 2);
  const variancePct = midpoint > 0 ? roundPct((totalHigh - totalLow) / midpoint) : 0;

  const hasBaseline = Boolean(baseline);
  const hasSteps = Boolean(stepsFactor);
  const hasCardio = Boolean(cardio);
  const hasStrength = Boolean(strength);

  const missingRequiredInputs: string[] = [];
  if (!hasBaseline) missingRequiredInputs.push("baseline");
  if (!hasSteps) missingRequiredInputs.push("steps");

  const largest = [...highContrib].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    modelVersion: MODEL_VERSION,
    computedAt,
    day,
    estimatedKcal: {
      low: totalLow,
      high: totalHigh,
      midpoint,
    },
    variancePct,
    confidence: confidenceFromCoverage(hasBaseline, hasSteps, hasCardio, hasStrength),
    factors: {
      ...(baseline ? { baseline } : {}),
      ...(stepsFactor ? { steps: stepsFactor } : {}),
      ...(cardio ? { cardio } : {}),
      ...(strength ? { strength } : {}),
    },
    missingRequiredInputs,
    ...(largest ? { largestDriver: largest } : {}),
  };
}
