// lib/ui/body-scans/BodyScanCategoryList.tsx
import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanType } from "@/lib/contracts";
import type { BodyScanCategorySummaryRow } from "@/lib/data/body-scans/bodyScanCategorySummary";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type BodyScanCategorySummaryListProps = {
  rows: readonly BodyScanCategorySummaryRow[];
  onPressCategory: (scanType: BodyScanType) => void;
  testID?: string;
};

const CategoryRow = memo(function CategoryRow({
  row,
  onPress,
}: {
  row: BodyScanCategorySummaryRow;
  onPress: (scanType: BodyScanType) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(row.category.type);
  }, [row.category.type, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityHint={row.category.accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`body-scan-category-row-${row.category.type}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.title} numberOfLines={2}>
          {row.category.label}
        </Text>
        <Text
          style={styles.meta}
          numberOfLines={2}
          testID={`body-scan-category-meta-${row.category.type}`}
        >
          {row.supportingCopy}
        </Text>
      </View>
      <Text style={styles.chevron} importantForAccessibility="no">
        {"\u203A"}
      </Text>
    </Pressable>
  );
});

/**
 * Compact grouped category navigator for Body Scans landing and hub.
 * Rows must come from category-scoped summaries (completeness-safe).
 */
export function BodyScanCategorySummaryList({
  rows,
  onPressCategory,
  testID = "body-scan-category-list",
}: BodyScanCategorySummaryListProps) {
  return (
    <View style={styles.card} testID={testID}>
      {rows.map((row, index) => (
        <View key={row.category.type}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <CategoryRow row={row} onPress={onPressCategory} />
        </View>
      ))}
    </View>
  );
}

/** @deprecated Prefer BodyScanCategorySummaryList with category-scoped rows. */
export const BodyScanCategoryList = BodyScanCategorySummaryList;

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 16,
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  rowPressed: { opacity: 0.85 },
  rowMain: { flex: 1, minWidth: 0, gap: 4, paddingRight: 8 },
  title: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  meta: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  chevron: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 22, marginLeft: 4 },
});
