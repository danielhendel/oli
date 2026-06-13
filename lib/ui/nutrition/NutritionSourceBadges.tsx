import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { FoodGraphSource, NutritionProductType } from "@oli/contracts/nutritionProduct";

const SOURCE_LABEL: Partial<Record<FoodGraphSource, string>> = {
  usda: "USDA",
  open: "Open Food Facts",
  curated: "Oli curated",
};

export type NutritionSourceBadgesProps = {
  source?: FoodGraphSource | undefined;
  productType?: NutritionProductType | undefined;
  attributionRequired?: boolean | undefined;
  /** Compact omits the longer attribution badge (used in dense list rows). */
  compact?: boolean | undefined;
};

/**
 * Source / supplement / attribution pills for a food row or detail header.
 * Attribution is rendered whenever `attributionRequired` is set (Open Food
 * Facts ODbL compliance).
 */
export function NutritionSourceBadges({
  source,
  productType,
  attributionRequired,
  compact,
}: NutritionSourceBadgesProps): React.ReactElement | null {
  const isSupplement = productType === "supplement";
  const sourceLabel = source ? SOURCE_LABEL[source] : undefined;
  const showAttribution = attributionRequired === true && !compact;

  if (!isSupplement && sourceLabel === undefined && !showAttribution) return null;

  return (
    <View style={styles.row} accessibilityRole="text">
      {isSupplement ? (
        <View style={[styles.badge, styles.supplement]} testID="badge-supplement">
          <Text style={[styles.badgeText, styles.supplementText]}>Supplement</Text>
        </View>
      ) : null}
      {sourceLabel !== undefined ? (
        <View style={styles.badge} testID="badge-source">
          <Text style={styles.badgeText}>{sourceLabel}</Text>
        </View>
      ) : null}
      {showAttribution ? (
        <View
          style={[styles.badge, styles.attribution]}
          testID="badge-attribution"
          accessibilityLabel="Nutrition data from Open Food Facts"
        >
          <Text style={[styles.badgeText, styles.attributionText]}>Data © Open Food Facts</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(60, 60, 67, 0.1)",
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#636366" },
  supplement: { backgroundColor: "rgba(88, 86, 214, 0.14)" },
  supplementText: { color: "#5856D6" },
  attribution: { backgroundColor: "rgba(0, 122, 255, 0.1)" },
  attributionText: { color: "#0A84FF" },
});
