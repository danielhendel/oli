import type { DailyFactsDto } from "@oli/contracts";
import {
  deepSleepMinutesToQualityScore,
  remSleepMinutesToQualityScore,
  sleepEfficiencyToQualityScore,
  sleepLatencyMinutesToQualityScore,
  totalSleepMinutesToQualityScore,
} from "@/lib/format/sleepMetricQualityScore";
import { ouraRatingLabelToPillColors } from "@/lib/format/sleepOuraRatingPillColors";
import { formatEfficiencyRatio, formatMinutesValue } from "@/lib/format/sleepDisplay";
import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import { scoreToRatingLabel } from "@/lib/format/ouraScore";
import {
  sleepDeepMinutesBarProgress,
  sleepEfficiencyBarProgress,
  sleepLatencyMinutesBarProgress,
  sleepRemMinutesBarProgress,
  sleepTotalMinutesBarProgress,
} from "@/lib/format/sleepMetricBarProgress";

export type SleepOliMetricPillModel = {
  label: OuraRatingLabel;
  color: string;
  backgroundColor: string;
};

export type SleepOliMetricRowModel = {
  key: string;
  label: string;
  valueDisplay: string;
  /** null = no numeric basis; show value as "—" and an empty track. */
  barProgress: number | null;
  /** null when the underlying metric is missing — no invented pill. */
  pill: SleepOliMetricPillModel | null;
};

type SleepBlock = NonNullable<DailyFactsDto["sleep"]>;

function pillFromQualityScore(score: number | null): SleepOliMetricPillModel | null {
  if (score == null) return null;
  const label = scoreToRatingLabel(score);
  const { color, backgroundColor } = ouraRatingLabelToPillColors(label);
  return { label, color, backgroundColor };
}

/**
 * Fixed set of Oli sleep fact rows for the sleep detail “last night” card (no vendor mix-in).
 */
export function buildSleepOliMetricRows(sleep: SleepBlock): SleepOliMetricRowModel[] {
  const totalMinutes = sleep.mainSleepMinutes ?? sleep.totalMinutes;
  const totalDisplay =
    sleep.mainSleepMinutes != null
      ? formatMinutesValue(sleep.mainSleepMinutes)
      : sleep.totalMinutes != null
        ? formatMinutesValue(sleep.totalMinutes)
        : "—";

  const efficiencyDisplay = formatEfficiencyRatio(sleep.efficiency);
  const latencyDisplay =
    sleep.latencyMinutes != null && Number.isFinite(sleep.latencyMinutes)
      ? `${Math.round(sleep.latencyMinutes)} min`
      : "—";
  const remDisplay = formatMinutesValue(sleep.remSleepMinutes);
  const deepDisplay = formatMinutesValue(sleep.deepSleepMinutes);

  const totalMinArg =
    totalMinutes != null && Number.isFinite(totalMinutes) ? totalMinutes : null;

  return [
    {
      key: "total",
      label: "Total sleep",
      valueDisplay: totalDisplay,
      barProgress: sleepTotalMinutesBarProgress(totalMinArg),
      pill: pillFromQualityScore(totalSleepMinutesToQualityScore(totalMinArg)),
    },
    {
      key: "efficiency",
      label: "Sleep efficiency",
      valueDisplay: efficiencyDisplay,
      barProgress: sleepEfficiencyBarProgress(sleep.efficiency),
      pill: pillFromQualityScore(sleepEfficiencyToQualityScore(sleep.efficiency)),
    },
    {
      key: "latency",
      label: "Sleep latency",
      valueDisplay: latencyDisplay,
      barProgress: sleepLatencyMinutesBarProgress(sleep.latencyMinutes),
      pill: pillFromQualityScore(sleepLatencyMinutesToQualityScore(sleep.latencyMinutes)),
    },
    {
      key: "rem",
      label: "REM sleep",
      valueDisplay: remDisplay,
      barProgress: sleepRemMinutesBarProgress(sleep.remSleepMinutes),
      pill: pillFromQualityScore(remSleepMinutesToQualityScore(sleep.remSleepMinutes)),
    },
    {
      key: "deep",
      label: "Deep sleep",
      valueDisplay: deepDisplay,
      barProgress: sleepDeepMinutesBarProgress(sleep.deepSleepMinutes),
      pill: pillFromQualityScore(deepSleepMinutesToQualityScore(sleep.deepSleepMinutes)),
    },
  ];
}
