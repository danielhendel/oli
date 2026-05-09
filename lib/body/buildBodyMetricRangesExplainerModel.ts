// Pure copy + tier tables for Body Composition metric range modals (reuses thresholds from interpretation math).
import type { UserProfileMain } from "@oli/contracts";

import {
  bodyFatBarRange,
  classifyBmi,
  type BodyOverviewInterpretations,
  type BodyOverviewMetrics,
} from "@/lib/body/bodyCompositionInterpretation";
import { BODY_ZONE_TO_VISUAL_SEGMENT_INDEX } from "@/lib/body/bodyOverviewBarDisplay";
import {
  bodyFatFitnessThresholds,
  leanMassRatioTolerance,
  sexForBodyFatBands,
  type MassDisplayUnit,
} from "@/lib/body/bodyCompositionShared";
import {
  interpretationZoneDisplayLabel,
  type InterpretationQualityZone,
} from "@/lib/body/bodyOverviewInterpretationBar";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";
import { formatBodyBmi, formatBodyLeanMass } from "@/lib/ui/body/bodyMetricFormatting";
import type { MetricLegendRowVm } from "@/lib/metrics/metricExplainerVm";
import type { MetricRangesExplainerTierBlock } from "@/lib/ui/metrics/MetricRangesExplainerLayout";

export type BodyMetricRangeLegendRowVm = MetricLegendRowVm;

export type BodyMetricRangesExplainerMetric = "bmi" | "bodyFat" | "leanMass";

export type BodyMetricRangesReadingVm = {
  valueLine: string;
  classificationLine: string;
  interpretationLine: string;
};

export type BodyMetricRangesExplainerVm = {
  title: string;
  reading: BodyMetricRangesReadingVm;
  metricExplainer: {
    title: string;
    paragraphs: readonly string[];
  };
  rangeLegend: {
    heading: string;
    rows: readonly MetricLegendRowVm[];
  };
  rangeMeaningsHeading: string;
  tiers: MetricRangesExplainerTierBlock[];
};

const QUALITY_ZONES: readonly InterpretationQualityZone[] = [
  "out_of_range",
  "fair",
  "good",
  "optimal",
];

/** Presentation-only dot colors aligned with overview tier chrome (not clinical thresholds). */
const BMI_LEGEND_DOT_COLORS = [
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[0].pillFg,
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[3].pillFg,
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[1].pillFg,
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[2].pillFg,
] as const;

const BODY_FAT_LEGEND_DOT_COLORS_FOUR = [
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[0].pillFg,
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[3].pillFg,
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[1].pillFg,
  MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[2].pillFg,
] as const;

function zoneLegendDotFg(zone: InterpretationQualityZone): string {
  const idx = BODY_ZONE_TO_VISUAL_SEGMENT_INDEX[zone];
  return MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME[idx].pillFg;
}

export function parseBodyMetricRangesExplainerMetric(raw: unknown): BodyMetricRangesExplainerMetric | null {
  if (raw === "bmi" || raw === "bodyFat" || raw === "leanMass") return raw;
  return null;
}

function bmiReadingInterpretation(bmi: number | null, tierLabel: string): string {
  if (bmi == null) {
    return "When you log weight and height, we will place your BMI on these reference bands. This number is a screening shortcut—not a verdict on your fitness.";
  }
  const cat = classifyBmi(bmi);
  switch (cat) {
    case "underweight":
      return `Your BMI reads lower than most adult reference charts (${tierLabel}). If this is new or unintentional, steady nutrition and your care team can help you interpret it in context.`;
    case "normal":
      return `Your BMI lands in the usual adult reference band (${tierLabel}). People with more muscle can sit higher here while still carrying a healthy amount of body fat—use body-fat trends if you want a fuller picture.`;
    case "overweight":
      return `Your BMI is above the usual adult reference band (${tierLabel}). That is one signal among many—muscle, hydration, and how measurements line up over time all matter.`;
    case "obese":
      return `Your BMI sits above common adult reference bands (${tierLabel}). Think of it as a gentle prompt to notice trends and everyday habits—not something to panic over on its own.`;
    default:
      return `We grouped your reading as ${tierLabel}. BMI is a helpful population shortcut; pair it with how you feel and other signals if you want the full story.`;
  }
}

function bodyFatReadingInterpretation(
  percent: number | null,
  tierLabel: string,
  sex: "male" | "female" | "unspecified",
): string {
  if (percent == null) {
    return "Logging body fat plus weight helps describe what you are carrying beyond the number on the scale.";
  }
  if (sex === "unspecified") {
    return `Your reading lines up with ${tierLabel} using the wider chart we show before sex-specific bands unlock. Add sex at birth in Profile if you want tighter, personalized bands.`;
  }
  return `At ${percent.toFixed(1)}%, we labeled this ${tierLabel}. Body fat describes how much of you is fat versus lean tissue—often more informative than weight alone when goals shift.`;
}

function leanReadingInterpretation(leanKg: number | null, tierLabel: string, massUnit: MassDisplayUnit): string {
  if (leanKg == null) {
    return "Lean mass includes muscle, bone, water, and organs. Tracking it alongside weight and body fat helps you notice meaningful changes—not just ups and downs on the scale.";
  }
  const massLabel = formatBodyLeanMass(leanKg, massUnit);
  return `Your lean mass reads ${massLabel} (${tierLabel}). Holding on to lean tissue supports strength and everyday resilience—especially when you are eating less or training hard.`;
}

function bmiTiers(): MetricRangesExplainerTierBlock[] {
  return [
    {
      title: "Underweight",
      rangeLine: "Below 18.5",
      body: "On WHO adult charts this sits below the usual lower edge. Some people are naturally lean; sudden drops deserve attention with trusted support.",
    },
    {
      title: "Normal weight",
      rangeLine: "18.5–24.9",
      body: "A familiar healthy-weight band for adults in population research—not a promise about fitness or disease risk by itself.",
    },
    {
      title: "Overweight",
      rangeLine: "25.0–29.9",
      body: "Above the usual healthy-weight band for height. Muscle and bone can lift BMI here too, so trends and other signals still matter.",
    },
    {
      title: "Obese class I+",
      rangeLine: "30 and above",
      body: "Higher than typical adult references for height. Helpful context when reviewed calmly over time—not an emergency label on its own.",
    },
  ];
}

function bmiLegendRows(): readonly MetricLegendRowVm[] {
  const tiers = bmiTiers();
  return tiers.map((t, i) => ({
    key: `bmi-${i}`,
    label: t.title,
    rangeLine: t.rangeLine,
    dotColor: BMI_LEGEND_DOT_COLORS[i] ?? BMI_LEGEND_DOT_COLORS[0],
  }));
}

function bodyFatTiers(
  sex: "male" | "female" | "unspecified",
  athleteMode: boolean,
): MetricRangesExplainerTierBlock[] {
  if (sex === "unspecified") {
    const { min, max } = bodyFatBarRange("unspecified", athleteMode);
    return [
      {
        title: "Wide reference span",
        rangeLine: `About ${min}%–${max}% on the overview bar`,
        body: "Without sex-specific bands we show a generous span so you still see movement. Add sex at birth in Profile to unlock the tighter fitness and average ranges used elsewhere.",
      },
      {
        title: "Very lean",
        rangeLine: "Low single-digit to low teens depending on measurement method",
        body: "Often reflects athletic leanness or day-to-day hydration swings—avoid comparing snapshots without context.",
      },
      {
        title: "Athletic / fit window",
        rangeLine: "Typical training-friendly lows through moderate highs",
        body: "Where many active adults land during focused programs—still only one piece of your overall picture.",
      },
      {
        title: "Moderate to higher carry",
        rangeLine: "Above athletic lows toward population averages",
        body: "Common during maintenance or busy seasons. Trends matter more than any single percentage.",
      },
      {
        title: "Higher sustained carry",
        rangeLine: "Above common averages for many adults",
        body: "Signals higher fat mass relative to peers—not something to fear on its own. Pair with energy, mood, and professional guidance when helpful.",
      },
    ];
  }

  const { fitnessLo, fitnessHi, averageHi } = bodyFatFitnessThresholds(sex, athleteMode);
  const athleteNote = athleteMode ? " Athlete mode assumes leaner training measurements can still be healthy." : "";
  return [
    {
      title: "Below fitness band",
      rangeLine: `Under ${fitnessLo}%`,
      body: `Lower than the fitness-oriented band (${fitnessLo}–${fitnessHi}%). Could mean very lean training—or worth confirming hydration and measurement timing.${athleteNote}`,
    },
    {
      title: "Fitness band",
      rangeLine: `${fitnessLo}%–${fitnessHi}%`,
      body: `Within the fitness-oriented span used in Body Composition scoring.${athleteNote}`,
    },
    {
      title: "Above fitness, within average",
      rangeLine: `Above ${fitnessHi}% up to ${averageHi}%`,
      body: `Above the fitness band but still inside the broader average span used here.${athleteNote}`,
    },
    {
      title: "Above average band",
      rangeLine: `Above ${averageHi}%`,
      body: `Higher than the average ceiling used in scoring.${athleteNote}`,
    },
  ];
}

function bodyFatLegendRows(
  sex: "male" | "female" | "unspecified",
  athleteMode: boolean,
): readonly BodyMetricRangeLegendRowVm[] {
  if (sex === "unspecified") {
    const { min, max } = bodyFatBarRange("unspecified", athleteMode);
    return [
      {
        key: "bf-u0",
        label: "Overview span",
        rangeLine: `~${min}%–${max}%`,
        dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[1],
      },
      {
        key: "bf-u1",
        label: "Very lean",
        rangeLine: "Low teens or lower (method-dependent)",
        dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[0],
      },
      {
        key: "bf-u2",
        label: "Athletic / fit",
        rangeLine: "Mid-teens through mid-twenties for many adults",
        dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[3],
      },
      {
        key: "bf-u3",
        label: "Moderate carry",
        rangeLine: "Toward upper twenties–thirties for many adults",
        dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[2],
      },
      {
        key: "bf-u4",
        label: "Higher carry",
        rangeLine: "Above common averages",
        dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[0],
      },
    ];
  }

  const { fitnessLo, fitnessHi, averageHi } = bodyFatFitnessThresholds(sex, athleteMode);
  return [
    {
      key: "bf-b0",
      label: "Below fitness band",
      rangeLine: `Under ${fitnessLo}%`,
      dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[0],
    },
    {
      key: "bf-b1",
      label: "Fitness band",
      rangeLine: `${fitnessLo}%–${fitnessHi}%`,
      dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[1],
    },
    {
      key: "bf-b2",
      label: "Above fitness, within average",
      rangeLine: `Above ${fitnessHi}% up to ${averageHi}%`,
      dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[2],
    },
    {
      key: "bf-b3",
      label: "Above average band",
      rangeLine: `Above ${averageHi}%`,
      dotColor: BODY_FAT_LEGEND_DOT_COLORS_FOUR[3],
    },
  ];
}

function leanTierBodies(zone: InterpretationQualityZone, tolPct: number): string {
  switch (zone) {
    case "optimal":
      return `Measured lean mass closely matches the simple estimate from weight and body fat—within about ±${tolPct}%, the same window Body Composition uses internally.`;
    case "good":
      return "Close match with the estimate—small gaps are normal when readings come from different times or devices.";
    case "fair":
      return "Noticeable mismatch worth double-checking inputs or timing before reading too much into it.";
    case "out_of_range":
      return "Large mismatch often traces to mixed sources, rounding, or measurements taken far apart—not necessarily an error in how you feel.";
    default:
      return "";
  }
}

function leanTiers(athleteMode: boolean): MetricRangesExplainerTierBlock[] {
  const tolPct = Math.round(leanMassRatioTolerance(athleteMode) * 100);
  return QUALITY_ZONES.map((zone) => ({
    title: interpretationZoneDisplayLabel(zone),
    rangeLine:
      zone === "optimal"
        ? `Within ±${tolPct}% of weight × (1 − body fat)`
        : "Mapped from lean-vs-estimate quality zones",
    body: leanTierBodies(zone, tolPct),
  }));
}

function leanLegendRows(athleteMode: boolean): readonly MetricLegendRowVm[] {
  const tolPct = Math.round(leanMassRatioTolerance(athleteMode) * 100);
  return QUALITY_ZONES.map((zone) => ({
    key: `lean-${zone}`,
    label: interpretationZoneDisplayLabel(zone),
    rangeLine:
      zone === "optimal"
        ? `Within ±${tolPct}% of weight × (1 − body fat)`
        : zone === "fair"
          ? "Noticeable gap vs estimate"
          : zone === "good"
            ? "Small gap vs estimate"
            : "Large gap vs estimate",
    dotColor: zoneLegendDotFg(zone),
  }));
}

export function buildBodyMetricRangesExplainerVm(
  metric: BodyMetricRangesExplainerMetric,
  input: {
    profile: UserProfileMain;
    overview: BodyOverviewMetrics;
    interpretations: BodyOverviewInterpretations;
    massUnit: MassDisplayUnit;
  },
): BodyMetricRangesExplainerVm | null {
  const { profile, overview, interpretations, massUnit } = input;

  if (metric === "bmi") {
    const bmi = overview.bmi;
    const ix = interpretations.bmi;
    return {
      title: "BMI ranges",
      reading: {
        valueLine: bmi != null ? `Your BMI: ${formatBodyBmi(bmi)}` : "Your BMI: —",
        classificationLine: `Classification: ${ix.bar.displayLabel}`,
        interpretationLine: bmiReadingInterpretation(bmi, ix.bar.displayLabel),
      },
      metricExplainer: {
        title: "What BMI tells you",
        paragraphs: [
          "BMI compares your weight with your height. It is a quick screening tool, not a full body composition test.",
          "People with more muscle may see a higher BMI while still carrying a healthy amount of body fat—that is why we pair BMI with other signals in Oli.",
        ],
      },
      rangeLegend: {
        heading: "WHO adult BMI bands",
        rows: bmiLegendRows(),
      },
      rangeMeaningsHeading: "What each range means",
      tiers: bmiTiers(),
    };
  }

  if (metric === "bodyFat") {
    const bf = overview.bodyFatPercent;
    const ix = interpretations.bodyFat;
    const sex = sexForBodyFatBands(profile.identity.sexAtBirth);
    return {
      title: "Body fat ranges",
      reading: {
        valueLine: bf != null ? `Your body fat: ${bf.toFixed(1)}%` : "Your body fat: —",
        classificationLine: `Classification: ${ix.bar.displayLabel}`,
        interpretationLine: bodyFatReadingInterpretation(bf, ix.bar.displayLabel, sex),
      },
      metricExplainer: {
        title: "What body fat tells you",
        paragraphs: [
          "Body fat percentage estimates how much of your weight comes from fat versus lean tissue—muscle, bone, organs, and water.",
          "Because it describes composition, it often tracks goal progress more clearly than weight alone, especially when you are strength training or reshaping.",
        ],
      },
      rangeLegend: {
        heading: sex === "unspecified" ? "General reference bands" : "Fitness and average bands",
        rows: bodyFatLegendRows(sex, profile.bodyInputs.athleteMode),
      },
      rangeMeaningsHeading: "What each range means",
      tiers: bodyFatTiers(sex, profile.bodyInputs.athleteMode),
    };
  }

  if (metric === "leanMass") {
    const lean = overview.leanBodyMassKg;
    const ix = interpretations.lean;
    return {
      title: "Lean mass ranges",
      reading: {
        valueLine:
          lean != null ? `Your lean mass: ${formatBodyLeanMass(lean, massUnit)}` : "Your lean mass: —",
        classificationLine: `Classification: ${ix.bar.displayLabel}`,
        interpretationLine: leanReadingInterpretation(lean, ix.bar.displayLabel, massUnit),
      },
      metricExplainer: {
        title: "What lean mass tells you",
        paragraphs: [
          "Lean mass includes muscle, bone, organs, and water—everything that is not stored body fat.",
          "Protecting lean mass supports strength, metabolism, and recovery. When weight drops, watching lean mass helps make sure you are not shedding muscle you want to keep.",
        ],
      },
      rangeLegend: {
        heading: "Consistency vs estimate",
        rows: leanLegendRows(profile.bodyInputs.athleteMode),
      },
      rangeMeaningsHeading: "What each range means",
      tiers: leanTiers(profile.bodyInputs.athleteMode),
    };
  }

  return null;
}
