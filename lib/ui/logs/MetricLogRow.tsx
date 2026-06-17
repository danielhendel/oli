import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HeaderOverflowMenuButton } from "@/lib/ui/HeaderOverflowMenuButton";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER_SUBTLE } from "@/lib/ui/theme/uiTokens";
import type { MetricLogRowMenuAnchor } from "@/lib/ui/logs/MetricLogRowMenu";

export type MetricLogRowProps = {
  dateLabel: string;
  primaryMetric: string;
  secondaryMetric?: string | null;
  accessibilityLabel: string;
  onPress?: () => void;
  onOpenMenu?: (anchor: MetricLogRowMenuAnchor) => void;
  showMenu?: boolean;
  testID?: string;
};

const ROW_MIN_HEIGHT = 44;
const MENU_HIT_SIZE = 44;

export function MetricLogRow({
  dateLabel,
  primaryMetric,
  secondaryMetric,
  accessibilityLabel,
  onPress,
  onOpenMenu,
  showMenu = true,
  testID,
}: MetricLogRowProps) {
  const menuRef = useRef<View>(null);

  const openMenu = () => {
    if (!onOpenMenu) return;
    menuRef.current?.measureInWindow((x, y, width, height) => {
      onOpenMenu({ x, y, width, height });
    });
  };

  const content = (
    <View style={styles.rowBody}>
      <View style={styles.textCol}>
        <Text style={styles.date} accessibilityElementsHidden importantForAccessibility="no">
          {dateLabel}
        </Text>
        <Text style={styles.primary} numberOfLines={2}>
          {primaryMetric}
        </Text>
        {secondaryMetric ? (
          <Text style={styles.secondary} numberOfLines={1}>
            {secondaryMetric}
          </Text>
        ) : null}
      </View>
      {showMenu && onOpenMenu ? (
        <View ref={menuRef} collapsable={false} style={styles.menuWrap}>
          <HeaderOverflowMenuButton onPress={openMenu} accessibilityLabel="Entry options" />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <View style={styles.wrap} testID={testID}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          {content}
        </Pressable>
        <View style={styles.divider} />
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID={testID} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>{content}</View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  row: {
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
    marginBottom: 4,
  },
  primary: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    lineHeight: 22,
  },
  secondary: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.12,
  },
  menuWrap: {
    minWidth: MENU_HIT_SIZE,
    minHeight: MENU_HIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginRight: -8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
  },
});
