// components/calendar/WeekHeader.tsx
import { View, StyleSheet, Pressable } from "react-native";
import DayPill from "./DayPill";
import { getWeekDays, isTodayYMD } from "../../lib/logging/selectors";
import { Text } from "../../lib/ui/Text";
import { toYMD } from "../../lib/util/date";

type Props = {
  /** Selected date in YYYY-MM-DD (defaults to today if omitted) */
  selectedYmd?: string;
  /** Any date (YYYY-MM-DD) inside the week to render; if omitted we use selectedYmd/today */
  displayBaseYmd?: string;
  /** Called when a day is tapped */
  onSelect?: (ymd: string) => void;
  /** Called when user taps previous-week chevron */
  onPrevWeek?: () => void;
  /** Called when user taps next-week chevron */
  onNextWeek?: () => void;
  /** Map of days that have logs: { "YYYY-MM-DD": true } */
  hasLogsMap?: Record<string, boolean>;
};

export default function WeekHeader({
  selectedYmd,
  displayBaseYmd,
  onSelect,
  onPrevWeek,
  onNextWeek,
  hasLogsMap,
}: Props) {
  const base = displayBaseYmd ?? selectedYmd ?? toYMD(new Date());
  const days = getWeekDays(base);

  return (
    <View>
      {/* One single row: ‹ Sun .. Sat › */}
      <View style={styles.row} accessibilityLabel="Week day list with navigation">
        {/* Prev week */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          hitSlop={8}
          onPress={onPrevWeek}
          style={styles.arrow}
        >
          <Text size="lg">{"‹"}</Text>
        </Pressable>

        {/* 7 equal-width columns */}
        {days.map((d) => (
          <View key={d.ymd} style={styles.col}>
            <DayPill
              label={d.label}
              ymd={d.ymd}
              isToday={isTodayYMD(d.ymd)}
              isSelected={selectedYmd ? selectedYmd === d.ymd : isTodayYMD(d.ymd)}
              hasLog={!!hasLogsMap?.[d.ymd]}
              onPress={() => onSelect?.(d.ymd)}
            />
          </View>
        ))}

        {/* Next week */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          hitSlop={8}
          onPress={onNextWeek}
          style={styles.arrow}
        >
          <Text size="lg">{"›"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  arrow: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  col: {
    flex: 1,
    alignItems: "center",
  },
});
