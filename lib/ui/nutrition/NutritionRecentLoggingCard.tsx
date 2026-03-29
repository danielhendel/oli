import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NutritionRecentLoggingItem } from "@/lib/data/nutrition/buildNutritionRecentLoggingItems";

export type NutritionRecentLoggingCardProps = {
  items: NutritionRecentLoggingItem[];
  onSelect: (item: NutritionRecentLoggingItem) => void;
};

export function NutritionRecentLoggingCard({ items, onSelect }: NutritionRecentLoggingCardProps) {
  return (
    <View style={styles.stack}>
      <Text style={styles.lede}>
        Reuse a recent day total. Tap an entry to fill your draft — you can still edit before saving.
      </Text>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No recent entries yet</Text>
          <Text style={styles.emptyBody}>After you save a day, it will show up here for quick reuse.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Apply ${item.title}, ${item.totalKcal} kilocalories`}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta}>
                {Math.round(item.totalKcal).toLocaleString()} kcal · P {Math.round(item.proteinG)} · C{" "}
                {Math.round(item.carbsG)} · F {Math.round(item.fatG)}
                {item.fiberG != null && item.fiberG > 0 ? ` · Fi ${Math.round(item.fiberG)}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  lede: { fontSize: 15, lineHeight: 22, color: "#636366", letterSpacing: -0.2 },
  empty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  emptyBody: { fontSize: 15, lineHeight: 22, color: "#636366" },
  list: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
    overflow: "hidden",
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    gap: 4,
    minHeight: 44,
  },
  rowPressed: { backgroundColor: "rgba(0,0,0,0.04)" },
  rowTitle: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  rowMeta: { fontSize: 14, fontWeight: "500", color: "#636366" },
});
