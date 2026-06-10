// lib/ui/timeline/TimelineDateNavigator.tsx
// Day selector row: previous / next day, formatted date, and a "Today" shortcut.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  UI_SCREEN_BG,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export function formatTimelineDateLabel(day: string): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export type TimelineDateNavigatorProps = {
  day: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function TimelineDateNavigator({
  day,
  isToday,
  onPrev,
  onNext,
  onToday,
}: TimelineDateNavigatorProps) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.navBtn}
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
      >
        <Ionicons name="chevron-back" size={20} color={UI_TEXT_PRIMARY} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.dateLabel} accessibilityLabel={`Selected day ${formatTimelineDateLabel(day)}`}>
          {isToday ? "Today" : formatTimelineDateLabel(day)}
        </Text>
        {!isToday ? <Text style={styles.subLabel}>{formatTimelineDateLabel(day)}</Text> : null}
      </View>

      <View style={styles.rightGroup}>
        {!isToday ? (
          <Pressable
            style={styles.todayBtn}
            onPress={onToday}
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.navBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Ionicons name="chevron-forward" size={20} color={UI_TEXT_PRIMARY} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 8,
  },
  center: { flex: 1, alignItems: "center" },
  dateLabel: { fontSize: 16, fontWeight: "700", color: UI_TEXT_PRIMARY },
  subLabel: { fontSize: 12, color: UI_TEXT_SECONDARY, marginTop: 2 },
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI_SCREEN_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  todayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: UI_SCREEN_BG,
  },
  todayBtnText: { fontSize: 13, fontWeight: "600", color: SYSTEM_ACCENT },
});
