import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NutritionThisWeekCardModel } from "@/lib/data/nutrition/nutritionThisWeekCardModel";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { dashMetricRowLabelTextStyle, dashMetricRowValueTextStyle } from "@/lib/ui/dash/dashMetricRowTextStyle";

type Props = {
  loading: boolean;
  model: NutritionThisWeekCardModel;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  onPressDay?: (dayKey: string) => void;
  testID?: string;
};

export function NutritionThisWeekCard({
  loading,
  model,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  onPressDay,
  testID = "nutrition-this-week-card",
}: Props): React.ReactElement {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel="This Week nutrition">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          This Week
        </Text>
        <View style={styles.headerSpacer} />
        <View style={styles.weekNavRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            accessibilityState={{ disabled: previousDisabled }}
            disabled={previousDisabled}
            onPress={onPressPrevious}
            hitSlop={10}
            style={({ pressed }) => [
              styles.weekNavButton,
              previousDisabled && styles.weekNavButtonDisabled,
              pressed && !previousDisabled && styles.weekNavButtonPressed,
            ]}
          >
            <Ionicons name="chevron-back" size={16} color={UI_TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.weekRangeLabel} numberOfLines={1} accessibilityLabel={`Week of ${model.weekRangeLabel}`}>
            {model.weekRangeLabel}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            accessibilityState={{ disabled: nextDisabled }}
            disabled={nextDisabled}
            onPress={onPressNext}
            hitSlop={10}
            style={({ pressed }) => [
              styles.weekNavButton,
              nextDisabled && styles.weekNavButtonDisabled,
              pressed && !nextDisabled && styles.weekNavButtonPressed,
            ]}
          >
            <Ionicons name="chevron-forward" size={16} color={UI_TEXT_PRIMARY} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <LoadingState variant="inline" message="Loading this week…" />
      ) : !model.hasData ? (
        <Text style={styles.emptyMessage}>{model.emptyMessage}</Text>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Avg when logged</Text>
            <Text style={styles.summaryValue}>
              {model.avgKcalLabel} · {model.avgProteinLabel} protein
            </Text>
          </View>
          <Text style={styles.daysLogged}>
            {model.daysLogged} of {model.daysInWeek} days logged
          </Text>
          <View style={styles.rowsWrap}>
            {model.rows.map((row) => (
              <Pressable
                key={row.dayKey}
                onPress={onPressDay != null ? () => onPressDay(row.dayKey) : undefined}
                disabled={onPressDay == null}
                accessibilityRole="button"
                accessibilityLabel={`${row.dayLabel}. ${row.kcalLabel}. ${row.proteinLabel} protein.`}
                style={({ pressed }) => [styles.dayRow, pressed && onPressDay != null && styles.dayRowPressed]}
              >
                <Text style={dashMetricRowLabelTextStyle}>{row.dayLabel}</Text>
                <Text style={[dashMetricRowValueTextStyle, !row.logged && styles.mutedValue]}>
                  {row.logged ? row.kcalLabel : "—"}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: strengthMetricCardTitleTextStyle,
  headerSpacer: { flex: 1 },
  weekNavRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  weekNavButton: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  weekNavButtonDisabled: { opacity: 0.35 },
  weekNavButtonPressed: { opacity: 0.7 },
  weekRangeLabel: { fontSize: 14, fontWeight: "600", color: UI_TEXT_SECONDARY, minWidth: 72, textAlign: "center" },
  summaryRow: { gap: 2 },
  summaryLabel: { fontSize: 13, color: UI_TEXT_TERTIARY_LABEL },
  summaryValue: { fontSize: 15, fontWeight: "600", color: UI_TEXT_PRIMARY },
  daysLogged: { fontSize: 14, color: UI_TEXT_SECONDARY },
  emptyMessage: { fontSize: 15, color: UI_TEXT_SECONDARY, lineHeight: 21 },
  rowsWrap: { gap: 4, marginTop: 4 },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 4,
  },
  dayRowPressed: { opacity: 0.7 },
  mutedValue: { color: UI_TEXT_TERTIARY_LABEL },
});
