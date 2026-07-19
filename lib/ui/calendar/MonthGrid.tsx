import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DayKey } from "./types";
import {
  getMonthGrid,
  getMonthGridLocal,
  formatMonthYearLabel,
  getTodayDayKeyLocal,
  type MonthYear,
} from "./dateUtils";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import type { ActivityCalendarDayRingModel } from "@/lib/ui/activity/activityCalendarDayRingPresentation";
import { ActivityDayRing } from "@/lib/ui/activity/ActivityDayRing";
import { WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL } from "@/lib/ui/calendar/weeklyCalendarStripTheme";
import { useOliColors } from "@/lib/ui/theme/OliColorContext";
import { WorkoutDayRing } from "./WorkoutDayRing";

export type MonthGridProps = {
  monthYear: MonthYear;
  markerForDay: (day: DayKey) => WorkoutMarkerFlags | null;
  onDayPress: (day: DayKey) => void;
  /**
   * `local` — cell `DayKey`s use the device calendar (matches Apple Health daily steps keys).
   * `utc` — legacy UTC-noon grid (default for Strength/Cardio calendars).
   */
  dayKeyBasis?: "utc" | "local";
  /** `activity` — a11y copy for step rollup markers; default `workout` for strength/cardio grids. */
  ringSemantics?: "workout" | "activity";
  /**
   * When set, Activity tier / neutral rings replace {@link WorkoutDayRing} (Activity calendar only).
   * `markerForDay` is ignored for the ring layer (pass a stub if unused).
   */
  activityCalendarDayForDay?: (day: DayKey) => ActivityCalendarDayRingModel;
  /** Optional selected day (Timeline sheet). */
  selectedDay?: DayKey;
  /** Optional inclusive upper bound. Days after this key remain visible but disabled. */
  maxDay?: DayKey;
  /** Override module marker copy for selection-only calendars. */
  accessibilityDetailForDay?: (day: DayKey) => string;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function MonthGrid({
  monthYear,
  markerForDay,
  onDayPress,
  dayKeyBasis = "utc",
  ringSemantics = "workout",
  activityCalendarDayForDay,
  selectedDay,
  maxDay,
  accessibilityDetailForDay,
}: MonthGridProps) {
  const colors = useOliColors();
  const todayKey = getTodayDayKeyLocal();
  const weeks = dayKeyBasis === "local" ? getMonthGridLocal(monthYear) : getMonthGrid(monthYear);
  const paddedWeeks = [...weeks];
  while (paddedWeeks.length < 6) {
    paddedWeeks.push([null, null, null, null, null, null, null]);
  }

  return (
    <View style={styles.container}>
      <Text
        style={[styles.headerTitle, { color: colors.textPrimary }]}
        accessibilityRole="header"
        testID={`calendar-month-heading-${monthYear.year}-${String(monthYear.month).padStart(2, "0")}`}
      >
        {formatMonthYearLabel(monthYear)}
      </Text>
      <View style={styles.dowRow}>
        {DOW_LABELS.map((label) => (
          <Text key={label} style={[styles.dowLabel, { color: colors.textTertiary }]}>
            {label}
          </Text>
        ))}
      </View>
      {paddedWeeks.map((week, idx) => (
        <View key={idx} style={styles.weekRow}>
          {week.map((dayKey, colIdx) => {
            if (!dayKey) {
              return <View key={colIdx} style={styles.dayCellEmpty} />;
            }
            const marker = markerForDay(dayKey);
            const hasStrength = !!marker?.hasStrength;
            const hasCardio = !!marker?.hasCardio;
            const hasRingMarker = hasStrength || hasCardio;
            const activityDayModel = activityCalendarDayForDay?.(dayKey);
            const isToday = dayKey === todayKey;
            const isSelected = dayKey === selectedDay;
            const isDisabled = maxDay != null && dayKey > maxDay;
            const baseA11yDetail =
              accessibilityDetailForDay?.(dayKey) ??
              (activityDayModel
                ? activityDayModel.accessibilityDetail
                : ringSemantics === "activity"
                  ? hasRingMarker
                    ? "steps in daily rollup"
                    : "no steps in daily rollup"
                  : hasRingMarker
                    ? "has workouts"
                    : "no workouts");
            const a11yDetail = [
              baseA11yDetail,
              isToday ? "Today" : null,
              isSelected ? "selected" : null,
              isDisabled ? "unavailable" : null,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <Pressable
                key={dayKey}
                onPress={() => {
                  if (!isDisabled) onDayPress(dayKey);
                }}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel={`${dayKey}, ${a11yDetail}`}
                accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                style={({ pressed }) => [
                  styles.dayCell,
                  isDisabled && styles.dayCellDisabled,
                  pressed && styles.dayCellPressed,
                ]}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.dayCircle,
                    (isSelected || (activityDayModel != null && isToday)) &&
                      styles.dayCircleSelected,
                  ]}
                >
                  <View style={styles.dayRingBackdrop} pointerEvents="none">
                    {activityDayModel != null ? (
                      <ActivityDayRing
                        size={32}
                        presentation={activityDayModel.presentation}
                        emphasized={false}
                        outerTestID={`month-outer-ring-${dayKey}`}
                      />
                    ) : (
                      <WorkoutDayRing
                        size={32}
                        hasStrength={hasStrength}
                        hasCardio={hasCardio}
                        emphasized={dayKey === todayKey}
                        outerTestID={`month-outer-ring-${dayKey}`}
                        innerTestID={`month-cardio-inner-ring-${dayKey}`}
                      />
                    )}
                  </View>
                  <Text style={[styles.dayNumber, { color: colors.textPrimary }]}>
                    {Number(dayKey.slice(8, 10))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.28,
    marginBottom: 14,
  },
  dowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  dayCellEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  dayCellPressed: {
    opacity: 0.7,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  /** Same fill as Strength weekly strip `dayCircleSelected` / header chrome. */
  dayCircleSelected: {
    backgroundColor: WEEKLY_STRIP_SELECTED_DAY_CIRCLE_FILL,
  },
  dayRingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },
});

