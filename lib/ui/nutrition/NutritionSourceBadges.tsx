import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { FoodGraphSource, NutritionProductType } from "@oli/contracts/nutritionProduct";
import { UI_BORDER_HAIRLINE, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: UI_TEXT_SECONDARY },
  supplement: { backgroundColor: "rgba(88, 86, 214, 0.2)" },
  supplementText: { color: "#AEB0FF" },
  attribution: { backgroundColor: "rgba(10, 132, 255, 0.16)" },
  attributionText: { color: "#64B5FF" },
});
