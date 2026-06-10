// lib/ui/timeline/TimelineEmptyState.tsx
// Friendly empty state for a day with no logged items.
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

export type TimelineEmptyStateProps = {
  isToday: boolean;
};

export function TimelineEmptyState({ isToday }: TimelineEmptyStateProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="No timeline entries">
      <Ionicons name="time-outline" size={36} color={UI_TEXT_TERTIARY_LABEL} />
      <Text style={styles.title}>{isToday ? "Nothing logged yet" : "Nothing logged"}</Text>
      <Text style={styles.body}>
        {isToday
          ? "Your day will appear here as data is logged or synced."
          : "No entries were recorded on this day."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY, marginTop: 8 },
  body: { fontSize: 14, color: UI_TEXT_SECONDARY, textAlign: "center", lineHeight: 20 },
});
