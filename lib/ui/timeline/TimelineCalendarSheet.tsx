// lib/ui/timeline/TimelineCalendarSheet.tsx
// Timeline date-jump sheet using Oli's canonical scrollable month calendar.
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MonthGrid } from "@/lib/ui/calendar/MonthGrid";
import {
  clampMonthYear,
  getTodayDayKeyLocal,
  type MonthYear,
} from "@/lib/ui/calendar/dateUtils";
import {
  buildCanonicalScrollableMonths,
  findScrollableMonthIndex,
  ScrollableMonthCalendar,
  type ScrollableCalendarMonth,
} from "@/lib/ui/calendar/ScrollableMonthCalendar";
import { useOliColors } from "@/lib/ui/theme/OliColorContext";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export type TimelineCalendarSheetProps = {
  visible: boolean;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onCancel: () => void;
  onReturnToToday: () => void;
};

function monthFromDay(day: string): MonthYear {
  const [year, month] = day.split("-").map(Number);
  return clampMonthYear({
    year: year || new Date().getFullYear(),
    month: month || 1,
  });
}

/**
 * Timeline visible months match the canonical Sleep/Workout/Activity window
 * (±12 around today). Selectable days stay capped via MonthGrid `maxDay={today}`.
 */
export function buildTimelineCalendarMonths(
  todayMonth: MonthYear,
): ScrollableCalendarMonth[] {
  return buildCanonicalScrollableMonths(todayMonth);
}

export function TimelineCalendarSheet({
  visible,
  selectedDay,
  onSelectDay,
  onCancel,
  onReturnToToday,
}: TimelineCalendarSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useOliColors();
  const today = useMemo(() => getTodayDayKeyLocal(), []);
  const initialMonth = useMemo(() => monthFromDay(selectedDay), [selectedDay]);
  const todayMonth = useMemo(() => monthFromDay(today), [today]);
  const months = useMemo(() => buildTimelineCalendarMonths(todayMonth), [todayMonth]);
  const initialMonthIndex = useMemo(
    () => findScrollableMonthIndex(months, initialMonth),
    [initialMonth, months],
  );
  const [headerYear, setHeaderYear] = useState(initialMonth.year);

  const onShow = useCallback(() => {
    setHeaderYear(initialMonth.year);
  }, [initialMonth]);

  const markerForDay = useCallback((): null => null, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      onShow={onShow}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.appScreenBg,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <View style={styles.toolbar} testID="timeline-calendar-fixed-header">
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel timeline calendar"
            hitSlop={12}
            style={styles.toolbarBtn}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text
            style={[styles.toolbarTitle, { color: colors.textPrimary }]}
            accessibilityRole="header"
            testID="timeline-calendar-year-heading"
          >
            {headerYear}
          </Text>
          <Pressable
            onPress={onReturnToToday}
            accessibilityRole="button"
            accessibilityLabel="Return to today"
            hitSlop={12}
            style={styles.toolbarBtn}
            disabled={selectedDay === today}
          >
            <Text style={[styles.todayText, selectedDay === today && styles.todayTextDisabled]}>
              Today
            </Text>
          </Pressable>
        </View>

        {/* Unmount when closed so reopen re-applies selected-month initialScrollIndex. */}
        {visible ? (
          <ScrollableMonthCalendar
            months={months}
            initialMonthIndex={initialMonthIndex}
            remountKey={`timeline:${selectedDay}:${initialMonthIndex}`}
            contentBottomPadding={insets.bottom + 24}
            testID="timeline-scrollable-calendar"
            onVisibleRangeChange={(_start, _end, year) => setHeaderYear(year)}
            renderMonth={(item) => (
              <MonthGrid
                monthYear={item.monthYear}
                markerForDay={markerForDay}
                onDayPress={onSelectDay}
                dayKeyBasis="local"
                selectedDay={selectedDay}
                maxDay={today}
                accessibilityDetailForDay={() => "Timeline day"}
              />
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  toolbarBtn: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: "center",
  },
  toolbarTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.35,
  },
  cancelText: {
    fontSize: 17,
  },
  todayText: {
    fontSize: 17,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
    textAlign: "right",
  },
  todayTextDisabled: {
    opacity: 0.4,
  },
});
