/**
 * Weekly Fitness metric modal VM — educational framing around Dash weekly goal rows.
 * Does not replace analytics screens elsewhere; presentation-only.
 */
import type { WeeklyFitnessRow } from "@/lib/data/dash/useWeeklyFitnessCard";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";

import type {
  MetricExplainerScreenVm,
  MetricExplainerStructuredSectionVm,
  MetricLegendRowVm,
} from "@/lib/metrics/metricExplainerVm";
import { MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME } from "@/lib/ui/overview/moduleOverviewStrengthTierPillChrome";

export type WeeklyFitnessExplainerRowKey = WeeklyFitnessRow["key"];

const SEG_DOT = MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME.map((c) => c.pillFg);

export function parseWeeklyFitnessExplainerRow(raw: unknown): WeeklyFitnessExplainerRowKey | null {
  if (raw === "activity" || raw === "cardio" || raw === "strength") return raw;
  return null;
}

function activityBundle(): {
  navTitle: string;
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    navTitle: "Weekly Activity",
    legendHeading: "Activity ranges",
    legend: [
      { key: "wa0", label: "Lower movement week", rangeLine: "Mostly under ~5k steps/day", dotColor: SEG_DOT[0]! },
      { key: "wa1", label: "Light movement week", rangeLine: "Comfortable daily walking volume", dotColor: SEG_DOT[1]! },
      { key: "wa2", label: "Balanced movement week", rangeLine: "Regular movement across most days", dotColor: SEG_DOT[2]! },
      { key: "wa3", label: "Active movement week", rangeLine: "Often near common step targets", dotColor: SEG_DOT[3]! },
      { key: "wa4", label: "High movement week", rangeLine: "Frequent high-step days", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "Quiet week",
        rangeLine: "Recovery or desk-heavy stretches",
        body: "Nothing wrong—use patterns as context, not guilt trips.",
      },
      {
        title: "Steady light week",
        rangeLine: "Baseline errands add up",
        body: "Small loops keep circulation humming between workouts.",
      },
      {
        title: "Balanced week",
        rangeLine: "Predictable movement rhythm",
        body: "Matches many sustainable lifestyles without heroic efforts.",
      },
      {
        title: "Active week",
        rangeLine: "Steps reinforce cardio habits",
        body: "Great companion to endurance sessions scheduled separately.",
      },
      {
        title: "High-motion week",
        rangeLine: "Lots of unstructured fuel burned",
        body: "Traveling, events, or labor-heavy jobs create spikes worth honoring.",
      },
    ],
    explainerTitle: "What this means",
    explainerParagraphs: [
      "Weekly activity reflects your day-to-day movement and supports the NEAT part of Daily Energy.",
      "Your weekly average smooths noisy single days so the trend is easier to trust.",
    ],
  };
}

function cardioBundle(): {
  navTitle: string;
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    navTitle: "Weekly Cardio",
    legendHeading: "Cardio ranges",
    legend: [
      { key: "wc0", label: "Minimal cardio week", rangeLine: "Little structured endurance work", dotColor: SEG_DOT[0]! },
      { key: "wc1", label: "Light cardio week", rangeLine: "A few shorter sessions", dotColor: SEG_DOT[1]! },
      { key: "wc2", label: "Moderate cardio week", rangeLine: "Regular aerobic sessions", dotColor: SEG_DOT[2]! },
      { key: "wc3", label: "High cardio week", rangeLine: "Frequent or longer cardio sessions", dotColor: SEG_DOT[3]! },
      { key: "wc4", label: "Endurance-focused week", rangeLine: "Sustained high cardio volume", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "Minimal structured cardio",
        rangeLine: "Low intentional endurance minutes",
        body: "Still compatible with active NEAT or recovery-forward programming.",
      },
      {
        title: "Light cardio week",
        rangeLine: "Enough for cardiovascular maintenance",
        body: "Easy aerobic doses complement heavier lifts without burying you.",
      },
      {
        title: "Moderate cardio week",
        rangeLine: "Structured endurance on repeat",
        body: "Heart and mitochondria get predictable stimulus.",
      },
      {
        title: "High cardio week",
        rangeLine: "Volume climbs noticeably",
        body: "Fuel intentionally—stress management matters just like splits.",
      },
      {
        title: "Endurance-heavy block",
        rangeLine: "Rare workload spikes",
        body: "Think races or backpacking prep—honor recovery blocks afterward.",
      },
    ],
    explainerTitle: "What this means",
    explainerParagraphs: [
      "Weekly cardio captures your intentional aerobic work across the week.",
      "This baseline shows consistency, not whether a single week is good or bad.",
    ],
  };
}

function strengthBundle(): {
  navTitle: string;
  legend: MetricLegendRowVm[];
  meanings: MetricExplainerScreenVm["tierMeanings"];
  explainerTitle: string;
  explainerParagraphs: string[];
  legendHeading: string;
} {
  return {
    navTitle: "Weekly Strength",
    legendHeading: "Strength ranges",
    legend: [
      { key: "ws0", label: "No logged sessions", rangeLine: "Recovery, deload, or time away", dotColor: SEG_DOT[0]! },
      { key: "ws1", label: "Light week", rangeLine: "Maintenance-level strength work", dotColor: SEG_DOT[1]! },
      { key: "ws2", label: "Moderate week", rangeLine: "Steady training across the week", dotColor: SEG_DOT[2]! },
      { key: "ws3", label: "Heavy week", rangeLine: "Higher strength workload", dotColor: SEG_DOT[3]! },
      { key: "ws4", label: "Very high week", rangeLine: "Peak training block volume", dotColor: SEG_DOT[4]! },
    ],
    meanings: [
      {
        title: "No logged sessions",
        rangeLine: "Recovery intentional",
        body: "Connective tissue still adapts—rest weeks belong in serious plans.",
      },
      {
        title: "Light week",
        rangeLine: "Primers or micro-workouts",
        body: "Keeps coordination sharp without burying the nervous system.",
      },
      {
        title: "Moderate week",
        rangeLine: "Classic hypertrophy rhythm",
        body: "Balanced sets × reps keep stimulus predictable.",
      },
      {
        title: "Heavy week",
        rangeLine: "Higher tonnage or intensity tools",
        body: "Recovery nutrition and sleep deserve explicit planning.",
      },
      {
        title: "Very high workload",
        rangeLine: "Meet prep or specialty phases",
        body: "Pair ambition with deloads—progress isn’t linear forever.",
      },
    ],
    explainerTitle: "What this means",
    explainerParagraphs: [
      "Weekly strength tracks how often you create a strength stimulus through the week.",
      "Frequency helps show consistency while leaving room for recovery between sessions.",
    ],
  };
}

function buildStructuredSectionVm(args: {
  rowKey: WeeklyFitnessExplainerRowKey;
  row: WeeklyFitnessRow;
  bundle: ReturnType<typeof activityBundle>;
}): MetricExplainerStructuredSectionVm {
  const { rowKey, row, bundle } = args;
  const whatThisMeansBody =
    rowKey === "activity"
      ? [
          `${row.label}: ${row.valueLabel} this week.`,
          "This reflects daily movement rhythm and its contribution to NEAT in your daily energy profile.",
        ]
      : rowKey === "strength"
        ? [
            `${row.label}: ${row.valueLabel} this week.`,
            "This reflects how often you applied a meaningful strength stimulus while preserving recovery days.",
          ]
        : [
            `${row.label}: ${row.valueLabel} this week.`,
            "This reflects your recent aerobic consistency across intentional cardio sessions.",
          ];

  const howToUseBody =
    rowKey === "activity"
      ? "Use this as a weekly trend signal; adjust your next few days rather than reacting to one day."
      : rowKey === "strength"
        ? "Use this to keep session frequency steady week to week, then match effort to recovery."
        : "Use this to plan the next cardio session with a pace and duration that feels sustainable.";

  return {
    whatThisMeansTitle: "What this means",
    whatThisMeansBody,
    rangesTitle: bundle.legendHeading,
    rangesRows: bundle.legend,
    howToUseTitle: "How to use this",
    howToUseBody,
  };
}

export function buildWeeklyFitnessMetricExplainerVm(args: {
  rowKey: WeeklyFitnessExplainerRowKey;
  row: WeeklyFitnessRow;
  goals: WeeklyFitnessGoalsResolved;
}): MetricExplainerScreenVm {
  const { rowKey, row, goals } = args;

  const bundle =
    rowKey === "activity" ? activityBundle() : rowKey === "cardio" ? cardioBundle() : strengthBundle();

  const readingLines = buildWeeklyFitnessReadingLines({ rowKey, row, goals });

  return {
    navigationTitle: bundle.navTitle,
    readingLines,
    structuredSection: buildStructuredSectionVm({ rowKey, row, bundle }),
    metricExplainerTitle: bundle.explainerTitle,
    metricExplainerParagraphs: bundle.explainerParagraphs,
    rangeLegendHeading: bundle.legendHeading,
    rangeLegendRows: bundle.legend,
    rangeMeaningsHeading: "What each band suggests",
    tierMeanings: bundle.meanings,
  };
}

function parseLeadingNumericValue(label: string): number | null {
  const m = label.trim().match(/^([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if (!m) return null;
  const numericText = m[1];
  if (numericText == null) return null;
  const n = Number(numericText.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function hasNoMetricData(rowKey: WeeklyFitnessExplainerRowKey, row: WeeklyFitnessRow): boolean {
  const n = parseLeadingNumericValue(row.valueLabel);
  if (n == null) return false;
  if (rowKey === "activity") return n <= 0;
  if (rowKey === "strength") return n <= 0;
  return n <= 0;
}

function activityReadingSentence(row: WeeklyFitnessRow, goals: WeeklyFitnessGoalsResolved): string {
  if (hasNoMetricData("activity", row)) return "No weekly activity data yet.";
  if (goals.activityStepsPerDayGoal <= 0) return "You logged movement this week and can build consistency over the next few days.";
  if (row.status === "complete") return "You’re above your daily movement target this week.";
  if (row.status === "onTrack") return "You’re close to your daily movement target this week.";
  return "You’re below your daily movement target this week.";
}

function strengthReadingSentence(row: WeeklyFitnessRow, goals: WeeklyFitnessGoalsResolved): string {
  if (hasNoMetricData("strength", row)) return "No strength workouts logged this week.";
  if (goals.strengthWorkoutsPerWeekGoal <= 0) return "You logged strength training this week and your routine can build with steady session spacing.";
  if (row.status === "complete") return "You’re above your weekly strength target this week.";
  if (row.status === "onTrack") return "You’re building toward your weekly strength target this week.";
  return "You’re below your weekly strength target this week.";
}

function cardioReadingSentence(row: WeeklyFitnessRow, goals: WeeklyFitnessGoalsResolved): string {
  if (hasNoMetricData("cardio", row)) return "No cardio logged this week.";
  if (goals.cardioMilesPerWeekGoal <= 0) return "You logged cardio this week and can build with another session in the next few days.";
  if (row.status === "complete") return "You’re meeting your weekly cardio target this week.";
  if (row.status === "onTrack") return "You’re building toward your weekly cardio target this week.";
  return "You’re below your weekly cardio target this week; this is the clearest area to build.";
}

function buildWeeklyFitnessReadingLines(args: {
  rowKey: WeeklyFitnessExplainerRowKey;
  row: WeeklyFitnessRow;
  goals: WeeklyFitnessGoalsResolved;
}): string[] {
  const { rowKey, row, goals } = args;
  const sentence =
    rowKey === "activity"
      ? activityReadingSentence(row, goals)
      : rowKey === "strength"
        ? strengthReadingSentence(row, goals)
        : cardioReadingSentence(row, goals);
  return [`${row.label}: ${row.valueLabel}`, sentence];
}
