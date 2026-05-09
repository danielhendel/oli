/**
 * Daily Energy metric modal VM — presentation only.
 * Uses server-supplied factors/influencers; no calorie recomputation on the client.
 */
import type { DailyFactsDto } from "@/lib/contracts";
import type {
  DailyEnergyCardDto,
  DailyEnergyFactorDto,
} from "@/lib/data/dash/useDailyEnergyCard";
import type { EnergyFactorRowKey } from "@/lib/ui/energy/energyPresentation";
import {
  buildBmrPersonalizedParagraph,
  buildCardioPersonalizedParagraph,
  buildImproveAccuracyTip,
  buildNeatPersonalizedParagraph,
  buildStrengthPersonalizedParagraph,
  bmrAccuracyNote,
  formatFactorDisplayAdditive,
  getFactorInputsUsedLabels,
  getFactorMissingInputLabels,
} from "@/lib/ui/energy/energyPresentation";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";

import type { MetricExplainerScreenVm, MetricLegendRowVm } from "@/lib/metrics/metricExplainerVm";

export type DailyEnergyExplainerMetricKey = EnergyFactorRowKey;

const SEG_DOT = MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME.map((c) => c.pillFg);

function capitalizeConfidence(conf: string): string {
  return conf.charAt(0).toUpperCase() + conf.slice(1);
}

function pickFactor(metric: DailyEnergyExplainerMetricKey, factors: DailyEnergyCardDto["factors"]) {
  switch (metric) {
    case "baseline":
      return factors.baseline;
    case "steps":
      return factors.steps;
    case "cardio":
      return factors.cardio;
    case "strength":
      return factors.strength;
    default:
      return undefined;
  }
}

export function parseDailyEnergyExplainerMetric(raw: unknown): DailyEnergyExplainerMetricKey | null {
  if (raw === "baseline" || raw === "steps" || raw === "cardio" || raw === "strength") return raw;
  return null;
}

export type DailyEnergyExplainerContext = {
  factor: DailyEnergyFactorDto;
  personalizedIntro: string;
  accuracyNote: string | null;
  improveTip: string | null;
  inputsUsedLabels: string[];
  inputsMissingLabels: string[];
  domainBullets: string[];
  accuracyWins: string[];
  missingSignals: string[];
  confidenceWord: string;
  rangeDisplay: string | null;
};

/** Mirrors legacy EnergyMetricDetail fact gathering (pure). */
export function collectDailyEnergyExplainerContext(args: {
  metric: DailyEnergyExplainerMetricKey;
  energy: DailyEnergyCardDto;
  facts: DailyFactsDto | undefined;
}): DailyEnergyExplainerContext | null {
  const { metric, energy, facts } = args;
  const factor = pickFactor(metric, energy.factors);
  if (factor == null) return null;
  const influencers = facts?.energyInfluencers;
  const confJoined = capitalizeConfidence(factor?.confidence ?? energy.confidence);

  const cardioDuration =
    metric === "cardio" && facts?.cardio?.durationMinutes != null ? facts.cardio.durationMinutes : undefined;

  let personalizedIntro = "";
  if (factor) {
    if (metric === "baseline") personalizedIntro = buildBmrPersonalizedParagraph(factor);
    else if (metric === "steps") personalizedIntro = buildNeatPersonalizedParagraph(factor);
    else if (metric === "cardio") {
      const cardioOpts =
        typeof cardioDuration === "number" && cardioDuration > 0 ? { durationMinutes: cardioDuration } : {};
      personalizedIntro = buildCardioPersonalizedParagraph(factor, cardioOpts);
    } else personalizedIntro = buildStrengthPersonalizedParagraph(factor);
  }

  const inputsUsedLabels =
    factor?.inputsUsed != null ? getFactorInputsUsedLabels(factor.inputsUsed) : [];
  const inputsMissingLabels =
    factor?.inputsMissing != null ? getFactorMissingInputLabels(factor.inputsMissing) : [];

  const rangeDisplay =
    factor && typeof factor.kcalLow === "number" && typeof factor.kcalHigh === "number"
      ? formatFactorDisplayAdditive(factor)
      : factor && typeof factor.kcal === "number"
        ? `+${Math.round(factor.kcal).toLocaleString()} kcal`
        : null;

  const domainBullets: string[] = [];
  const accuracyWins: string[] = [];
  const missingSignals: string[] = [];

  if (metric === "steps") {
    const steps = influencers?.movement?.steps ?? facts?.activity?.steps;
    const distanceM = influencers?.movement?.distanceMeters;
    const bodyWeightKnown = factor?.inputsUsed?.some((k) => k.includes("body.weightKg"));
    if (typeof steps === "number") domainBullets.push(`${Math.round(steps).toLocaleString()} steps logged`);
    if (typeof distanceM === "number" && distanceM > 0) {
      domainBullets.push(`${(distanceM / 1000).toFixed(2)} km walking/running distance`);
      accuracyWins.push("Distance improves NEAT precision versus steps alone.");
    } else {
      missingSignals.push("Walking or running distance for today");
    }
    if (bodyWeightKnown) domainBullets.push("Body weight available for load estimates");
    else missingSignals.push("Recent body weight");
  } else if (metric === "cardio") {
    const dur = influencers?.cardio?.durationMinutes ?? facts?.cardio?.durationMinutes;
    const dist = influencers?.cardio?.distanceMeters ?? facts?.cardio?.distanceMeters;
    const sport = influencers?.cardio?.sport ?? facts?.cardio?.primarySport;
    if (typeof dur === "number" && dur > 0) domainBullets.push(`${Math.round(dur)} minutes logged`);
    if (typeof dist === "number" && dist > 0) domainBullets.push(`${(dist / 1609.344).toFixed(2)} miles`);
    if (typeof sport === "string") domainBullets.push(sport);
    if (typeof influencers?.cardio?.paceMinPerKm === "number" && influencers.cardio.paceMinPerKm > 0) {
      domainBullets.push(`${influencers.cardio.paceMinPerKm.toFixed(2)} min/km pace`);
    }
    const hasHr = typeof influencers?.cardio?.averageHeartRateBpm === "number";
    if (hasHr) {
      domainBullets.push(`Average HR ${Math.round(influencers?.cardio?.averageHeartRateBpm ?? 0)} bpm`);
      accuracyWins.push("Heart rate helps align intensity with energy burn.");
    } else {
      missingSignals.push("Average workout heart rate");
    }
    if (typeof influencers?.cardio?.maxHeartRateBpm === "number") {
      domainBullets.push(`Peak HR ${Math.round(influencers.cardio.maxHeartRateBpm)} bpm`);
    }
    if (!(typeof dist === "number" && dist > 0)) {
      missingSignals.push("Workout distance");
    }
  } else if (metric === "strength") {
    const s = influencers?.strength;
    const sport = s?.sport ?? facts?.strength?.primarySport;
    if (typeof sport === "string") domainBullets.push(sport);
    if (typeof s?.volumeKg === "number") domainBullets.push(`${Math.round(s.volumeKg).toLocaleString()} kg volume`);
    if (typeof s?.durationMinutes === "number") domainBullets.push(`${Math.round(s.durationMinutes)} minutes`);
    if (typeof s?.sets === "number") domainBullets.push(`${Math.round(s.sets)} sets`);
    if (typeof s?.reps === "number") domainBullets.push(`${Math.round(s.reps)} reps`);
    if (typeof s?.densityKgPerMinute === "number") {
      domainBullets.push(`${s.densityKgPerMinute.toFixed(1)} kg/min density`);
      accuracyWins.push("Density sharpens how demanding the session was.");
    } else {
      missingSignals.push("Session timing for density estimates");
    }
    if (typeof s?.averageHeartRateBpm === "number") {
      domainBullets.push(`Average HR ${Math.round(s.averageHeartRateBpm)} bpm`);
      accuracyWins.push("Heart rate adds context for heavier circuits.");
    } else {
      missingSignals.push("In-session heart rate");
    }
    if (typeof s?.maxHeartRateBpm === "number") {
      domainBullets.push(`Peak HR ${Math.round(s.maxHeartRateBpm)} bpm`);
    }
  } else if (metric === "baseline") {
    const leanMass =
      factor?.inputsUsed?.some((k) => k === "body.leanBodyMassKg" || k === "body.bodyFatPercent") ?? false;
    if (leanMass) accuracyWins.push("Lean mass data tightens your resting-energy band.");
    else missingSignals.push("Lean mass or body fat %");
    if (!factor?.inputsUsed?.some((k) => k === "profile.dateOfBirth")) missingSignals.push("Date of birth (for age)");
    if (!factor?.inputsUsed?.some((k) => k === "profile.heightCm")) missingSignals.push("Height");
    if (!factor?.inputsUsed?.some((k) => k === "profile.sexAtBirth")) missingSignals.push("Sex at birth");
  }

  const accuracyNote = metric === "baseline" && factor ? bmrAccuracyNote(factor) : null;
  const improveTip =
    factor != null
      ? buildImproveAccuracyTip({
          metric,
          factor,
          energyMissingRequired: energy.missingRequiredInputs,
        })
      : null;

  return {
    factor,
    personalizedIntro,
    accuracyNote,
    improveTip,
    inputsUsedLabels,
    inputsMissingLabels,
    domainBullets,
    accuracyWins,
    missingSignals,
    confidenceWord: confJoined,
    rangeDisplay,
  };
}

function bmrStatic(): {
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    legendHeading: "How baseline estimates often cluster",
    legend: [
      { key: "bmr-l", label: "Lower baseline", rangeLine: "Smaller frames or lower lean mass profiles", dotColor: SEG_DOT[0]! },
      { key: "bmr-m", label: "Average baseline", rangeLine: "Typical adult resting ranges", dotColor: SEG_DOT[3]! },
      { key: "bmr-h", label: "Higher baseline", rangeLine: "Taller builds or higher lean mass profiles", dotColor: SEG_DOT[1]! },
      { key: "bmr-a", label: "Athletic / high-output baseline", rangeLine: "Very active muscle maintenance", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "Lower baseline",
        rangeLine: "Population models with modest resting burn",
        body: "Often aligns with smaller stature, lighter lean mass, or age-related slowing—still only a model, not a judgment.",
      },
      {
        title: "Average baseline",
        rangeLine: "Mid-pack resting burn for adults",
        body: "Where many adults land before adding movement—helpful anchor for everything layered on top.",
      },
      {
        title: "Higher baseline",
        rangeLine: "More resting energy relative to peers",
        body: "Common with more lean tissue, larger frames, or youthful physiology—muscle is a quiet calorie furnace.",
      },
      {
        title: "Athletic / high-output baseline",
        rangeLine: "Elevated resting needs from trained muscle",
        body: "Maintenance for strength-focused bodies runs hotter—your logged lean mass helps Oli respect that.",
      },
    ],
    explainerTitle: "What basal metabolic rate means",
    explainerParagraphs: [
      "Basal metabolic rate is the energy your body spends keeping organs alive, temperature steady, and tissues repaired—even lying still.",
      "Lean mass, overall body size, sex, and age are the big levers. When lean mass is logged, Oli can narrow the resting estimate compared with weight-only formulas.",
    ],
  };
}

function neatStatic(): {
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    legendHeading: "Everyday movement intensity",
    legend: [
      { key: "neat-0", label: "Very low movement", rangeLine: "Mostly seated day", dotColor: SEG_DOT[0]! },
      { key: "neat-1", label: "Light movement", rangeLine: "Short walks and errands", dotColor: SEG_DOT[1]! },
      { key: "neat-2", label: "Moderate movement", rangeLine: "Steady pacing between tasks", dotColor: SEG_DOT[2]! },
      { key: "neat-3", label: "High movement", rangeLine: "On-feet most of the day", dotColor: SEG_DOT[3]! },
      { key: "neat-4", label: "Extremely active day", rangeLine: "Lots of unstructured motion", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "Very low movement",
        rangeLine: "Desk-heavy schedules",
        body: "Few spontaneous steps—your estimate leans on lighter NEAT unless workouts compensate.",
      },
      {
        title: "Light movement",
        rangeLine: "Sprinkled walking",
        body: "Think quick errands and occasional pacing—energy ticks up gently throughout the day.",
      },
      {
        title: "Moderate movement",
        rangeLine: "Regular walking breaks",
        body: "Standing desks, neighborhood loops, or childcare hustle lift burn without formal cardio.",
      },
      {
        title: "High movement",
        rangeLine: "Mostly upright living",
        body: "Retail shifts, urban commuting on foot, or busy caregiving days quietly stack calories.",
      },
      {
        title: "Extremely active day",
        rangeLine: "Rare high-step lifestyles",
        body: "Festivals, sightseeing, or physically demanding jobs—NEAT can rival small workouts.",
      },
    ],
    explainerTitle: "What NEAT means",
    explainerParagraphs: [
      "Non-exercise activity thermogenesis is every calorie from daily movement outside structured workouts—walking, chores, pacing, even fidgeting.",
      "Steps are the clearest signal we usually get; walking distance tightens the band when available. NEAT naturally swings day to day, so gentle trends beat chasing perfection.",
    ],
  };
}

function cardioStatic(): {
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    legendHeading: "Structured cardio effort bands",
    legend: [
      { key: "c0", label: "Minimal cardio", rangeLine: "Easy pace / short duration", dotColor: SEG_DOT[0]! },
      { key: "c1", label: "Light cardio", rangeLine: "Comfortable conversational effort", dotColor: SEG_DOT[1]! },
      { key: "c2", label: "Moderate cardio", rangeLine: "Steady breathing, sustainable pace", dotColor: SEG_DOT[2]! },
      { key: "c3", label: "High cardio", rangeLine: "Hard sustained sessions", dotColor: SEG_DOT[3]! },
      { key: "c4", label: "Endurance-heavy day", rangeLine: "Long duration or repeated efforts", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "Minimal cardio",
        rangeLine: "Easy stimulus",
        body: "Great for recovery days—the calorie bump is modest but meaningful psychologically.",
      },
      {
        title: "Light cardio",
        rangeLine: "Easy aerobic work",
        body: "Supports circulation and endurance without digging deeply into reserves.",
      },
      {
        title: "Moderate cardio",
        rangeLine: "Sweet-spot conditioning",
        body: "Where many adults spend sustainable training—heart rate and duration strongly steer burn.",
      },
      {
        title: "High cardio",
        rangeLine: "Hard intervals or prolonged tempo",
        body: "Burn climbs quickly; logging duration and intensity cues keeps estimates grounded.",
      },
      {
        title: "Endurance-heavy day",
        rangeLine: "Long mileage blocks",
        body: "Think trail sessions or brick workouts—fueling and recovery deserve equal billing.",
      },
    ],
    explainerTitle: "What cardio contributes here",
    explainerParagraphs: [
      "Cardio captures intentional endurance work—runs, rides, brisk hikes—distinct from everyday NEAT.",
      "Duration, pace or distance, and heart-rate context all inform how much extra burn Oli credits today.",
    ],
  };
}

function strengthStatic(): {
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    legendHeading: "Strength-session demand bands",
    legend: [
      { key: "s0", label: "No strength load", rangeLine: "Recovery or rest day", dotColor: SEG_DOT[0]! },
      { key: "s1", label: "Light session", rangeLine: "Technique or accessory focus", dotColor: SEG_DOT[1]! },
      { key: "s2", label: "Moderate session", rangeLine: "Balanced volume", dotColor: SEG_DOT[2]! },
      { key: "s3", label: "Heavy session", rangeLine: "High mechanical work", dotColor: SEG_DOT[3]! },
      { key: "s4", label: "Very high training load", rangeLine: "Dense strength blocks", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "No strength load",
        rangeLine: "Dedicated recovery",
        body: "Muscle repair still costs energy, but structured lifting adds none today.",
      },
      {
        title: "Light session",
        rangeLine: "Priming or mobility-heavy lifting",
        body: "Adds modest burn while keeping joints and patterns tuned.",
      },
      {
        title: "Moderate session",
        rangeLine: "Typical hypertrophy or balanced lifting",
        body: "Enough volume to stimulate strength without wiping you out.",
      },
      {
        title: "Heavy session",
        rangeLine: "High-intensity lifting",
        body: "Mechanical work and longer rests increase estimated burn—precision improves with logged volume and timing.",
      },
      {
        title: "Very high training load",
        rangeLine: "Competition prep or high-density circuits",
        body: "Recovery nutrition and sleep matter here—your estimate signals demand, not virtue.",
      },
    ],
    explainerTitle: "What strength training contributes",
    explainerParagraphs: [
      "Resistance training builds stimulus for muscle and bone; metabolically it raises workload above resting levels during and after sessions.",
      "Logged volume, timing, and optional heart-rate cues help Oli estimate the calorie bump without replacing coaching nuance.",
    ],
  };
}

const NAV_TITLE: Record<DailyEnergyExplainerMetricKey, string> = {
  baseline: "BMR",
  steps: "NEAT",
  cardio: "Cardio",
  strength: "Strength",
};

export function buildDailyEnergyMetricExplainerVm(args: {
  metric: DailyEnergyExplainerMetricKey;
  ctx: DailyEnergyExplainerContext;
}): MetricExplainerScreenVm | null {
  const { metric, ctx } = args;

  const staticBundle =
    metric === "baseline"
      ? bmrStatic()
      : metric === "steps"
        ? neatStatic()
        : metric === "cardio"
          ? cardioStatic()
          : strengthStatic();

  const readingLines: string[] = [];
  readingLines.push(ctx.rangeDisplay != null ? `Today’s estimate: ${ctx.rangeDisplay}` : "Today’s estimate is still tightening.");
  readingLines.push(`Estimate confidence: ${ctx.confidenceWord}`);
  readingLines.push(ctx.personalizedIntro);
  if (ctx.accuracyNote) readingLines.push(ctx.accuracyNote);
  if (ctx.domainBullets.length > 0) {
    readingLines.push(`Signals captured: ${ctx.domainBullets.slice(0, 5).join("; ")}`);
  }
  if (ctx.accuracyWins.length > 0) {
    readingLines.push(ctx.accuracyWins.join(" "));
  }
  if (ctx.inputsUsedLabels.length > 0) {
    readingLines.push(`Inputs referenced: ${ctx.inputsUsedLabels.join(", ")}`);
  }
  if (ctx.inputsMissingLabels.length > 0) {
    readingLines.push(`Still helpful to add: ${ctx.inputsMissingLabels.join(", ")}`);
  }
  if (ctx.missingSignals.length > 0) {
    readingLines.push(`Signals that would sharpen this further: ${ctx.missingSignals.join(", ")}`);
  }
  if (ctx.improveTip) readingLines.push(ctx.improveTip);

  return {
    navigationTitle: NAV_TITLE[metric],
    readingLines,
    metricExplainerTitle: staticBundle.explainerTitle,
    metricExplainerParagraphs: staticBundle.explainerParagraphs,
    rangeLegendHeading: staticBundle.legendHeading,
    rangeLegendRows: staticBundle.legend,
    rangeMeaningsHeading: "What each range means",
    tierMeanings: staticBundle.meanings,
  };
}
