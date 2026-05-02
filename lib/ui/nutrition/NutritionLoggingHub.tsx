import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { DayKey } from "@/lib/ui/calendar/types";
import { useNutritionMeta } from "@/lib/hooks/useNutritionMeta";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";

const CARD = "#FFFFFF";

export type NutritionLoggingHubProps = {
  dayKey: DayKey;
  onOpenSearch: () => void;
  onScanBarcode: () => void;
  onQuickAdd: () => void;
  onBuildMeal: () => void;
};

/**
 * Search-first landing: primary catalog search, quick actions, favorites/recents, honest placeholders.
 */
export function NutritionLoggingHub({
  dayKey,
  onOpenSearch,
  onScanBarcode,
  onQuickAdd,
  onBuildMeal,
}: NutritionLoggingHubProps) {
  const router = useRouter();
  const metaApi = useNutritionMeta();

  const favoriteHashes = useMemo(
    () => new Set((metaApi.meta?.favoriteFoods ?? []).map((f) => f.foodHash)),
    [metaApi.meta?.favoriteFoods],
  );
  const favorites = metaApi.meta?.favoriteFoods ?? [];
  const recentsFiltered = useMemo(
    () => (metaApi.meta?.recentFoods ?? []).filter((r) => !favoriteHashes.has(r.foodHash)),
    [metaApi.meta?.recentFoods, favoriteHashes],
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onOpenSearch}
        style={({ pressed }) => [styles.searchCard, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Search food, brand, restaurant, or barcode"
      >
        <Text style={styles.searchPlaceholder}>Search food, brand, restaurant, or barcode</Text>
        <Text style={styles.searchHint}>Opens catalog search</Text>
      </Pressable>

      <View style={styles.quickRow}>
        <Pressable
          onPress={onScanBarcode}
          style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
        >
          <Text style={styles.quickBtnText}>Scan barcode</Text>
        </Pressable>
        <Pressable
          onPress={onQuickAdd}
          style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Quick add macros"
        >
          <Text style={styles.quickBtnText}>Quick add</Text>
        </Pressable>
        <Pressable
          onPress={onBuildMeal}
          style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Build meal from items"
        >
          <Text style={styles.quickBtnText}>Build meal</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorites</Text>
        {metaApi.loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : favorites.length === 0 ? (
          <Text style={styles.empty}>Favorite foods appear here.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
            keyboardShouldPersistTaps="handled"
          >
            {favorites.map((f) => (
              <Pressable
                key={f.foodHash}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/nutrition/food/[foodId]",
                    params: { foodId: f.id, day: dayKey },
                  })
                }
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open favorite ${f.name}`}
              >
                <Text style={styles.chipText} numberOfLines={1}>
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent</Text>
        {metaApi.loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : recentsFiltered.length === 0 ? (
          <Text style={styles.empty}>Recently logged foods appear here.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
            keyboardShouldPersistTaps="handled"
          >
            {recentsFiltered.map((r) => (
              <Pressable
                key={`${r.foodHash}-${r.lastUsedAt}`}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/nutrition/food/[foodId]",
                    params: { foodId: r.id, day: dayKey },
                  })
                }
                style={({ pressed }) => [styles.chip, styles.chipMuted, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open recent ${r.name}`}
              >
                <Text style={styles.chipTextMuted} numberOfLines={1}>
                  {r.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={[styles.placeholderCard, styles.comingSoon]}>
        <Text style={styles.comingSoonTitle}>Saved meals</Text>
        <Text style={styles.comingSoonBody}>Saved meals coming soon — you’ll combine foods into reusable templates.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  searchCard: {
    minHeight: 56,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  searchPlaceholder: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  searchHint: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.35)",
    justifyContent: "center",
  },
  quickBtnText: { fontSize: 15, fontWeight: "700", color: NUTRITION_ACCENT },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#636366", letterSpacing: 0.3, textTransform: "uppercase" },
  chipStrip: { gap: 8, paddingVertical: 2 },
  chip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 122, 255, 0.35)",
  },
  chipMuted: {
    backgroundColor: "rgba(60, 60, 67, 0.06)",
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  chipText: { fontSize: 15, fontWeight: "600", color: NUTRITION_ACCENT },
  chipTextMuted: { fontSize: 15, fontWeight: "500", color: "#1C1C1E" },
  muted: { fontSize: 15, color: "#8E8E93" },
  empty: { fontSize: 15, color: "#8E8E93", lineHeight: 21 },
  placeholderCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.1)",
  },
  comingSoon: { opacity: 0.85 },
  comingSoonTitle: { fontSize: 16, fontWeight: "700", color: "#1C1C1E", marginBottom: 6 },
  comingSoonBody: { fontSize: 15, color: "#636366", lineHeight: 21 },
  pressed: { opacity: 0.72 },
});
