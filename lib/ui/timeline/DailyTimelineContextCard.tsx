// Compact Sleep / Recovery / Activity summary for Daily Timeline v1.
// Distinct from chronological action rows — no fabricated occurrence times.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TimelineDayContextRow } from "@/lib/features/timeline/types";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_BORDER_HAIRLINE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

export type DailyTimelineContextCardProps = {
  rows: readonly TimelineDayContextRow[];
  onPressRow: (row: TimelineDayContextRow) => void;
};

function ContextRow({
  row,
  isLast,
  onPress,
}: {
  row: TimelineDayContextRow;
  isLast: boolean;
  onPress: () => void;
}) {
  const actionable = !!row.href;
  const value =
    row.availability === "available" && row.valueLabel
      ? row.valueLabel
      : "Unavailable";
  return (
    <Pressable
      onPress={actionable ? onPress : undefined}
      disabled={!actionable}
      accessibilityRole={actionable ? "button" : "text"}
      accessibilityLabel={row.accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        actionable && pressed && styles.rowPressed,
      ]}
      testID={`timeline-context-${row.kind}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={row.icon as never} size={16} color={SYSTEM_ACCENT} />
      </View>
      <Text style={styles.title}>{row.title}</Text>
      <Text
        style={[
          styles.value,
          row.availability === "unavailable" && styles.valueUnavailable,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {actionable ? (
        <Ionicons name="chevron-forward" size={14} color={UI_TEXT_TERTIARY_LABEL} />
      ) : (
        <View style={styles.chevronSpacer} />
      )}
    </Pressable>
  );
}

export function DailyTimelineContextCard({
  rows,
  onPressRow,
}: DailyTimelineContextCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      testID="timeline-daily-context-card"
    >
      {rows.map((row, index) => (
        <ContextRow
          key={row.kind}
          row={row}
          isLast={index === rows.length - 1}
          onPress={() => onPressRow(row)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: UI_GROUPED_CARD_RADIUS,
    marginBottom: 12,
    overflow: "hidden",
    ...elevatedCardSurfaceStyle,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  rowPressed: { opacity: 0.7 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  title: {
    width: 78,
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  value: {
    flex: 1,
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
    textAlign: "right",
  },
  valueUnavailable: { color: UI_TEXT_MUTED, fontStyle: "italic" },
  chevronSpacer: { width: 14 },
});
