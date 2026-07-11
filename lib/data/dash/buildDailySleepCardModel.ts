import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";
import { formatEfficiencyRatio } from "@/lib/format/sleepDisplay";
import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import {
  formatSleepDurationMinutes,
  normalizeOuraScore0to100,
  tryClassifyOuraScore,
} from "@/lib/format/ouraScore";

const EMPTY = "\u2014";
const SCORE_UNAVAILABLE_LABEL = "Sleep score unavailable";
const SCORE_UNAVAILABLE_A11Y = "Sleep score unavailable";

export type DailySleepRatingTone = "optimal" | "good" | "watch" | "low";

function ouraLabelToTone(label: OuraRatingLabel): DailySleepRatingTone {
  switch (label) {
    case "Optimal":
      return "optimal";
    case "Good":
      return "good";
    case "Fair":
      return "watch";
    case "Pay attention":
      return "low";
    default:
      return "watch";
  }
}

/** Detail payload for metric row bottom sheet. */
export type DailySleepMetricDetail = {
  title: string;
  value: string;
  body: string;
  sourceLine?: string;
  contextLine?: string;
};

export type DailySleepMetricRow = {
  id: string;
  label: string;
  value: string;
  accessibilityValue: string;
  isAvailable: boolean;
  detail: DailySleepMetricDetail;
};

export type DailySleepCardModel = {
  /** Calendar day Dash requested (e.g. today). */
  day: string;
  /**
   * Large hero value for the active presentation:
   * - dash: Sleep Score text (or null when unavailable)
   * - detail: sleep duration text
   */
  headlineValueText: string | null;
  /** Formatted duration when known (Dash metric row + detail hero source). */
  durationValueText: string | null;
  /** True when dash metrics exist but Sleep Score is not displayable. */
  scoreUnavailable: boolean;
  /** VoiceOver / UI label when scoreUnavailable. */
  scoreUnavailableLabel: string | null;
  scoreValueText: string | null;
  ratingLabel: string | null;
  ratingTone: DailySleepRatingTone | null;
  summarySentence: string;
  metricRows: DailySleepMetricRow[];
  hasAnySignal: boolean;
  emptyStateTitle: string | null;
  emptyStateSubtitle: string | null;
  /** Shown under title when there is sleep signal (matches Daily Energy subtitle pattern). */
  lastNightSubtitle: string | null;
};

type MetricDetailCtx = {
  requestedCalendarDay: string;
  anchorDay: string;
  remPercent: number | null;
};

function sleepNightContextLine(ctx: MetricDetailCtx): string {
  if (ctx.requestedCalendarDay === ctx.anchorDay) return `Sleep night: ${ctx.anchorDay}`;
  return `Sleep night: ${ctx.anchorDay} · Calendar day: ${ctx.requestedCalendarDay}`;
}

function displayOrEmpty(value: string): { value: string; accessibilityValue: string; isAvailable: boolean } {
  if (value === EMPTY) {
    return { value: EMPTY, accessibilityValue: "Not available", isAvailable: false };
  }
  return { value, accessibilityValue: value, isAvailable: true };
}

function formatLowestHeartRate(night: SleepNightDocumentDto): string {
  const v = night.lowestHeartRateBpm;
  if (typeof v !== "number" || !Number.isFinite(v)) return EMPTY;
  return `${Math.round(v)} bpm`;
}

function formatAverageHrv(night: SleepNightDocumentDto): string {
  const v = night.averageHrvMs;
  if (typeof v !== "number" || !Number.isFinite(v)) return EMPTY;
  return `${Math.round(v)} ms`;
}

export function buildSleepMetricDetail(
  id: string,
  label: string,
  value: string,
  ctx: MetricDetailCtx,
): DailySleepMetricDetail {
  const ctxLine = sleepNightContextLine(ctx);
  switch (id) {
    case "sleep_duration":
      return {
        title: label,
        value,
        body: "Total time asleep for this sleep night from your stored SleepNight summary.",
        sourceLine: "Canonical SleepNight duration (main sleep when present).",
        contextLine: ctxLine,
      };
    case "deep_sleep":
      return {
        title: label,
        value,
        body: "Deep sleep is one of the main sleep stages associated with physical restoration.",
        contextLine: ctxLine,
      };
    case "rem_sleep": {
      const pct =
        ctx.remPercent != null
          ? `REM was about ${ctx.remPercent}% of recorded sleep time used for this summary.`
          : null;
      const contextParts = [pct, ctxLine].filter((x): x is string => Boolean(x));
      return {
        title: label,
        value,
        body: "REM sleep supports learning, memory, and nervous system recovery.",
        contextLine: contextParts.join(" "),
      };
    }
    case "sleep_efficiency": {
      return {
        title: label,
        value,
        body: "Sleep efficiency compares time asleep against time in bed.",
        sourceLine: "Wearable-reported efficiency from your stored sleep night.",
        contextLine: ctxLine,
      };
    }
    case "lowest_heart_rate": {
      return {
        title: label,
        value,
        body:
          "Lowest heart rate during this sleep window from your Oura sleep period summary. " +
          "Stored on your canonical sleep night when sync merges Oura wellness metrics.",
        sourceLine: "Oura sleep period wellness fields, merged into SleepNight at sync.",
        contextLine: ctxLine,
      };
    }
    case "average_hrv": {
      return {
        title: label,
        value,
        body:
          "Average HRV in milliseconds from your Oura sleep period summary when the API reports it.",
        sourceLine: "Oura sleep `average_hrv`, surfaced via SleepNight.",
        contextLine: ctxLine,
      };
    }
    default:
      return {
        title: label,
        value,
        body: "Metric detail for this sleep night.",
        contextLine: ctxLine,
      };
  }
}

function totalMinutesForDenominator(night: SleepNightDocumentDto): number | null {
  const m = night.mainSleepMinutes ?? night.totalSleepMinutes;
  if (typeof m === "number" && Number.isFinite(m) && m > 0) return m;
  return null;
}

function remPercentFromNight(night: SleepNightDocumentDto): number | null {
  if (typeof night.remPercent === "number" && Number.isFinite(night.remPercent)) return Math.round(night.remPercent);
  const total = totalMinutesForDenominator(night);
  const rem = night.remMinutes;
  if (typeof rem !== "number" || !Number.isFinite(rem) || rem < 0 || total == null || total <= 0) return null;
  return Math.round((rem / total) * 100);
}

/**
 * Sleep Score is trusted only when it is a finite 0–100 on the same attributed SleepNight
 * document that supplies duration/stage metrics (same-day join by construction).
 */
export function resolveTrustedSleepScore(night: SleepNightDocumentDto | undefined): number | null {
  if (night == null) return null;
  return normalizeOuraScore0to100(night.score);
}

function metricRowsFromSleepNight(
  requestedCalendarDay: string,
  night: SleepNightDocumentDto,
  presentation: "dash" | "detail",
): DailySleepMetricRow[] {
  const anchorDay = night.anchorDay;
  const totalMin = totalMinutesForDenominator(night);
  const durationVal = totalMin != null ? formatSleepDurationMinutes(Math.round(totalMin)) : EMPTY;
  const deepM = typeof night.deepMinutes === "number" ? Math.round(night.deepMinutes) : undefined;
  const remM = typeof night.remMinutes === "number" ? Math.round(night.remMinutes) : undefined;
  const deepVal = deepM != null ? formatSleepDurationMinutes(deepM) : EMPTY;
  const remVal = remM != null ? formatSleepDurationMinutes(remM) : EMPTY;
  const effVal = formatEfficiencyRatio(night.efficiency);
  const remPercent = remPercentFromNight(night);
  const ctx: MetricDetailCtx = { requestedCalendarDay, anchorDay, remPercent };
  const hrVal = formatLowestHeartRate(night);
  const hrvVal = formatAverageHrv(night);

  const specs =
    presentation === "dash"
      ? ([
          { id: "sleep_duration", label: "Duration", value: durationVal },
          { id: "deep_sleep", label: "Deep sleep", value: deepVal },
          { id: "rem_sleep", label: "REM sleep", value: remVal },
          { id: "sleep_efficiency", label: "Sleep efficiency", value: effVal },
        ] as const)
      : ([
          { id: "deep_sleep", label: "Deep sleep", value: deepVal },
          { id: "rem_sleep", label: "REM sleep", value: remVal },
          { id: "sleep_efficiency", label: "Sleep efficiency", value: effVal },
          { id: "lowest_heart_rate", label: "Lowest heart rate", value: hrVal },
          { id: "average_hrv", label: "Average HRV", value: hrvVal },
        ] as const);

  return specs.map((s) => {
    const disp = displayOrEmpty(s.value);
    return {
      id: s.id,
      label: s.label,
      value: disp.value,
      accessibilityValue: disp.accessibilityValue,
      isAvailable: disp.isAvailable,
      detail: buildSleepMetricDetail(s.id, s.label, s.value, ctx),
    };
  });
}

function emptyMetricRows(
  requestedCalendarDay: string,
  anchorDay: string,
  presentation: "dash" | "detail",
): DailySleepMetricRow[] {
  const ctx: MetricDetailCtx = { requestedCalendarDay, anchorDay, remPercent: null };
  const specs =
    presentation === "dash"
      ? ([
          { id: "sleep_duration", label: "Duration", value: EMPTY },
          { id: "deep_sleep", label: "Deep sleep", value: EMPTY },
          { id: "rem_sleep", label: "REM sleep", value: EMPTY },
          { id: "sleep_efficiency", label: "Sleep efficiency", value: EMPTY },
        ] as const)
      : ([
          { id: "deep_sleep", label: "Deep sleep", value: EMPTY },
          { id: "rem_sleep", label: "REM sleep", value: EMPTY },
          { id: "sleep_efficiency", label: "Sleep efficiency", value: EMPTY },
          { id: "lowest_heart_rate", label: "Lowest heart rate", value: EMPTY },
          { id: "average_hrv", label: "Average HRV", value: EMPTY },
        ] as const);
  return specs.map((s) => ({
    id: s.id,
    label: s.label,
    value: s.value,
    accessibilityValue: "Not available",
    isAvailable: false,
    detail: buildSleepMetricDetail(s.id, s.label, s.value, ctx),
  }));
}

function efficiencyRatioForSummary(night: SleepNightDocumentDto): number | null {
  const e = night.efficiency;
  if (typeof e !== "number" || !Number.isFinite(e) || e < 0) return null;
  return e;
}

function buildSleepSummarySentence(args: {
  inputsSettled: boolean;
  hasAnySignal: boolean;
  score: number | null;
  shortSleep: boolean;
  sleepGood: boolean;
}): { summary: string; emptyTitle: string | null; emptySubtitle: string | null } {
  if (!args.inputsSettled) {
    return { summary: "", emptyTitle: null, emptySubtitle: null };
  }
  if (!args.hasAnySignal) {
    return {
      summary: "",
      emptyTitle: "No sleep data yet",
      emptySubtitle: "Sync Oura or check back after your next sleep.",
    };
  }
  if (args.score != null) {
    if (args.score >= 85) {
      return {
        summary: "Strong overall sleep quality for this day.",
        emptyTitle: null,
        emptySubtitle: null,
      };
    }
    if (args.score >= 70) {
      return {
        summary: "Good overall sleep quality for this day.",
        emptyTitle: null,
        emptySubtitle: null,
      };
    }
    if (args.score >= 55) {
      return {
        summary: "Fair sleep quality with some room to improve.",
        emptyTitle: null,
        emptySubtitle: null,
      };
    }
    return {
      summary: "Sleep quality signals suggest focusing on recovery tonight.",
      emptyTitle: null,
      emptySubtitle: null,
    };
  }
  if (args.shortSleep) {
    return {
      summary: "Sleep was short, which may affect how you feel today.",
      emptyTitle: null,
      emptySubtitle: null,
    };
  }
  if (args.sleepGood) {
    return {
      summary: "Sleep duration and efficiency look solid for this day.",
      emptyTitle: null,
      emptySubtitle: null,
    };
  }
  return {
    summary: "Key metrics below summarize last night\u2019s sleep.",
    emptyTitle: null,
    emptySubtitle: null,
  };
}

export function buildDailySleepCardModel(input: {
  day: string;
  /** From `GET /users/me/sleep-night` when available. */
  resolution?: SleepNightResolution;
  sleepNight: SleepNightDocumentDto | undefined;
  sleepNightSettled: boolean;
  /**
   * `dash` (default): Sleep Score hero + Duration-first rows (no LHR/HRV).
   * `detail`: duration hero + stage/physiology rows including LHR/HRV (Sleep screen).
   */
  presentation?: "dash" | "detail";
}): DailySleepCardModel {
  const { day, sleepNight, sleepNightSettled } = input;
  const presentation = input.presentation ?? "dash";

  const inputsSettled = sleepNightSettled;

  const trustedScore = resolveTrustedSleepScore(sleepNight);
  const scoreValueText = trustedScore != null ? String(trustedScore) : null;
  const ratingLabel = tryClassifyOuraScore(trustedScore);
  const ratingTone = ratingLabel != null ? ouraLabelToTone(ratingLabel) : null;

  const totalMin = sleepNight != null ? totalMinutesForDenominator(sleepNight) : null;
  const durationValueText =
    sleepNight != null && totalMin != null ? formatSleepDurationMinutes(Math.round(totalMin)) : null;

  const anchorDayForEmpty = sleepNight?.anchorDay ?? day;
  const metricRows =
    sleepNight != null
      ? metricRowsFromSleepNight(day, sleepNight, presentation)
      : emptyMetricRows(day, anchorDayForEmpty, presentation);

  const rowHasSignal = (r: DailySleepMetricRow) => r.isAvailable;
  const hasRowSignal = metricRows.some(rowHasSignal);
  const hasAnySignal =
    hasRowSignal || trustedScore != null || durationValueText != null;

  const scoreUnavailable = presentation === "dash" && hasAnySignal && trustedScore == null;

  let totalMinutesForShort: number | null = null;
  let efficiencyForGood: number | null = null;
  if (sleepNight != null) {
    totalMinutesForShort = totalMinutesForDenominator(sleepNight);
    efficiencyForGood = efficiencyRatioForSummary(sleepNight);
  }

  const shortSleep = totalMinutesForShort != null && totalMinutesForShort < 360;
  const sleepGood =
    totalMinutesForShort != null &&
    totalMinutesForShort >= 420 &&
    (efficiencyForGood == null ||
      (efficiencyForGood <= 1 && efficiencyForGood >= 0.82) ||
      (efficiencyForGood > 1 && efficiencyForGood >= 82));

  const { summary: summarySentence, emptyTitle, emptySubtitle } = buildSleepSummarySentence({
    inputsSettled,
    hasAnySignal,
    score: presentation === "dash" ? trustedScore : null,
    shortSleep,
    sleepGood,
  });

  const displaySummary = !inputsSettled ? "" : !hasAnySignal ? "" : summarySentence;
  const emptyStateTitle = !hasAnySignal && inputsSettled ? emptyTitle : null;
  const emptyStateSubtitle = !hasAnySignal && inputsSettled ? emptySubtitle : null;

  const lastNightSubtitle = inputsSettled && hasAnySignal ? "Last night\u2019s sleep" : null;

  const headlineValueText =
    presentation === "detail" ? durationValueText : scoreValueText;

  return {
    day,
    headlineValueText,
    durationValueText,
    scoreUnavailable,
    scoreUnavailableLabel: scoreUnavailable ? SCORE_UNAVAILABLE_LABEL : null,
    scoreValueText,
    ratingLabel,
    ratingTone,
    summarySentence: displaySummary,
    metricRows,
    hasAnySignal,
    emptyStateTitle,
    emptyStateSubtitle,
    lastNightSubtitle,
  };
}

export function emptyDailySleepCardModel(day: string): DailySleepCardModel {
  return buildDailySleepCardModel({
    day,
    sleepNight: undefined,
    sleepNightSettled: true,
  });
}

export { SCORE_UNAVAILABLE_A11Y };
