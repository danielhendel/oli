/**
 * Weekly Fitness metric modal VM — educational framing around Dash weekly goal rows.
 * Does not replace analytics screens elsewhere; presentation-only.
 */
import type { WeeklyFitnessRow } from "@/lib/data/dash/useWeeklyFitnessCard";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";

import type { MetricExplainerScreenVm, MetricLegendRowVm } from "@/lib/metrics/metricExplainerVm";
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
    legendHeading: "Step-volume archetypes (weekly lens)",
    legend: [
      { key: "wa0", label: "Quiet week", rangeLine: "Most days under ~5k steps", dotColor: SEG_DOT[0]! },
      { key: "wa1", label: "Steady light week", rangeLine: "Many days near comfortable walking volume", dotColor: SEG_DOT[1]! },
      { key: "wa2", label: "Balanced week", rangeLine: "Most days mix errands + intentional walks", dotColor: SEG_DOT[2]! },
      { key: "wa3", label: "Active week", rangeLine: "Often near popular daily movement targets", dotColor: SEG_DOT[3]! },
      { key: "wa4", label: "High-motion week", rangeLine: "Frequent high-step days stacked together", dotColor: SEG_DOT[4]! },
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
    explainerTitle: "How weekly activity fits NEAT",
    explainerParagraphs: [
      "Weekly Activity summarizes recent daily movement—the same family of signals Daily Energy calls NEAT, viewed across your week.",
      "Averages smooth noisy single-day totals so you can see momentum without obsessing over one sleepy Wednesday.",
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
    legendHeading: "Structured cardio volume bands",
    legend: [
      { key: "wc0", label: "Minimal structured cardio", rangeLine: "Mostly NEAT or strength-focused weeks", dotColor: SEG_DOT[0]! },
      { key: "wc1", label: "Light cardio week", rangeLine: "Short sessions sprinkled through the calendar", dotColor: SEG_DOT[1]! },
      { key: "wc2", label: "Moderate cardio week", rangeLine: "Regular endurance doses", dotColor: SEG_DOT[2]! },
      { key: "wc3", label: "High cardio week", rangeLine: "Long mileage or frequent tempo blocks", dotColor: SEG_DOT[3]! },
      { key: "wc4", label: "Endurance-heavy block", rangeLine: "Race prep or volume spike weeks", dotColor: SEG_DOT[4]! },
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
    explainerTitle: "Weekly cardio load",
    explainerParagraphs: [
      "Weekly cardio aggregates purposeful endurance training across your rolling calendar range.",
      "Walking counted toward Daily Energy still matters for wellness—this row highlights intentional cardio workouts logged inside Oli.",
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
    legendHeading: "Resistance-training workload bands",
    legend: [
      { key: "ws0", label: "No logged sessions", rangeLine: "Deload or travel weeks", dotColor: SEG_DOT[0]! },
      { key: "ws1", label: "Light week", rangeLine: "Maintenance lifts", dotColor: SEG_DOT[1]! },
      { key: "ws2", label: "Moderate week", rangeLine: "Balanced sessions across muscle groups", dotColor: SEG_DOT[2]! },
      { key: "ws3", label: "Heavy week", rangeLine: "High mechanical demand", dotColor: SEG_DOT[3]! },
      { key: "ws4", label: "Very high workload", rangeLine: "Peaking blocks", dotColor: SEG_DOT[4]! },
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
    explainerTitle: "Weekly strength stimulus",
    explainerParagraphs: [
      "Weekly Strength counts structured resistance sessions logged during this rolling window.",
      "Muscle stimulus supports metabolism long after sets finish—this lens captures consistency rather than any single heroic workout.",
    ],
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

  const goalParts: string[] = [];
  if (rowKey === "activity" && goals.activityStepsPerDayGoal > 0) {
    goalParts.push(`${goals.activityStepsPerDayGoal.toLocaleString()} steps per day target`);
  }
  if (rowKey === "strength" && goals.strengthWorkoutsPerWeekGoal > 0) {
    goalParts.push(`${goals.strengthWorkoutsPerWeekGoal} strength sessions per week target`);
  }
  if (rowKey === "cardio" && goals.cardioMilesPerWeekGoal > 0) {
    goalParts.push(`${goals.cardioMilesPerWeekGoal} cardio miles per week target`);
  }

  const readingLines: string[] = [`${row.label}: ${row.valueLabel}`, row.accessibilityValueLabel];
  if (goalParts.length > 0) {
    readingLines.push(`Goals you’ve set: ${goalParts.join(" · ")}`);
  }
  readingLines.push(
    row.hasGoal
      ? `Progress toward this week’s goal reads ${Math.round(Math.min(1, Math.max(0, row.progress)) * 100)}% — momentum matters more than perfection.`
      : "No numeric goal is enabled here yet — tap My goal whenever you want a gentle weekly anchor.",
  );

  return {
    navigationTitle: bundle.navTitle,
    readingLines,
    metricExplainerTitle: bundle.explainerTitle,
    metricExplainerParagraphs: bundle.explainerParagraphs,
    rangeLegendHeading: bundle.legendHeading,
    rangeLegendRows: bundle.legend,
    rangeMeaningsHeading: "What each band suggests",
    tierMeanings: bundle.meanings,
  };
}
