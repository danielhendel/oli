// lib/ui/body-scans/BodyScanCategoryList.tsx
import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanType } from "@/lib/contracts";
import type { BodyScanCategoryGroup } from "@/lib/data/body-scans/groupBodyScansByCategory";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type BodyScanCategoryListProps = {
  groups: readonly BodyScanCategoryGroup[];
  onPressCategory: (scanType: BodyScanType) => void;
  testID?: string;
};

const CategoryRow = memo(function CategoryRow({
  group,
  onPress,
}: {
  group: BodyScanCategoryGroup;
  onPress: (scanType: BodyScanType) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(group.category.type);
  }, [group.category.type, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={group.accessibilityLabel}
      accessibilityHint={group.category.accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`body-scan-category-row-${group.category.type}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.title} numberOfLines={2}>
          {group.category.label}
        </Text>
        <Text
          style={styles.meta}
          numberOfLines={2}
          testID={`body-scan-category-meta-${group.category.type}`}
        >
          {group.supportingCopy}
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
 */
export function BodyScanCategoryList({
  groups,
  onPressCategory,
  testID = "body-scan-category-list",
}: BodyScanCategoryListProps) {
  return (
    <View style={styles.card} testID={testID}>
      {groups.map((group, index) => (
        <View key={group.category.type}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <CategoryRow group={group} onPress={onPressCategory} />
        </View>
      ))}
    </View>
  );
}

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
