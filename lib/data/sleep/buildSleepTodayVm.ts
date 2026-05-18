import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import { completedSleepMinutesForCalendarDay } from "@/lib/data/sleep/sleepCompletedNights";
import {
  sleepDurationRatingFromMinutes,
  sleepDurationRatingPillColors,
  type SleepDurationRatingLabel,
} from "@/lib/data/sleep/sleepDurationRating";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepTodayVm = {
  selectedDay: DayKey;
  loading: boolean;
  durationText: string | null;
  statusPill: {
    label: SleepDurationRatingLabel;
    color: string;
    backgroundColor: string;
  } | null;
  subtitle: string;
  compactStatsSummaryForA11y: string;
};

export function buildSleepTodayVm(input: {
  selectedDay: DayKey;
  loading: boolean;
  cell: WeeklyFitnessSleepNightCell | undefined;
}): SleepTodayVm {
  const { selectedDay, loading, cell } = input;

  if (loading || cell == null || !cell.settled) {
    return {
      selectedDay,
      loading: true,
      durationText: null,
      statusPill: null,
      subtitle: "",
      compactStatsSummaryForA11y: "Loading sleep",
    };
  }

  const minutes = completedSleepMinutesForCalendarDay(selectedDay, cell);
  if (minutes == null) {
    return {
      selectedDay,
      loading: false,
      durationText: null,
      statusPill: null,
      subtitle: "No completed sleep found for this day.",
      compactStatsSummaryForA11y: "No completed sleep",
    };
  }

  const durationText = formatSleepDurationMinutes(minutes);
  const rating = sleepDurationRatingFromMinutes(minutes);
  const chrome = sleepDurationRatingPillColors(rating);

  return {
    selectedDay,
    loading: false,
    durationText,
    statusPill: {
      label: rating,
      color: chrome.color,
      backgroundColor: chrome.backgroundColor,
    },
    subtitle: "Completed sleep from last night.",
    compactStatsSummaryForA11y: durationText,
  };
}
