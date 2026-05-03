import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_STACK_HEADER_TITLE_STYLE,
  WORKOUTS_HEADER_BAR_BG,
  WORKOUTS_SCREEN_CONTENT_BG,
} from "@/lib/ui/headers/workoutsStackHeader";

const SIDE_SLOT = 56;
const ROW_MIN = 44;

export type WorkoutsNavBarProps = {
  /** Omit center title (balanced bar: back + empty center + right spacer). */
  hideTitle?: boolean;
  title?: string;
  onBackPress: () => void;
  rightSlot?: React.ReactNode;
  /** Override default right column width (e.g. live workout timer). */
  rightSlotWidth?: number;
  /** With `hideTitle`, centered content (e.g. live workout clock). */
  centerSlot?: React.ReactNode;
  /**
   * How the center slot sizes within the bar. `center` keeps the default (good for a compact clock).
   * `fill` stretches the slot to remaining width so children (e.g. search field) can use full space.
   */
  centerSlotLayout?: "center" | "fill";
  /** `flush` uses grouped-list screen background and no bottom hairline (e.g. active workout log). */
  surface?: "default" | "flush";
  /** Horizontal inset for the header row (e.g. 20 to align with page grid). */
  contentPaddingHorizontal?: number;
  /** Minimum height of the header content row (below safe area). */
  rowMinHeight?: number;
  /** Left column width; should fit {@link HeaderBackButton} visual size. */
  leftColumnWidth?: number;
  backButtonSize?: "default" | "large";
  testID?: string;
};

/**
 * In-screen nav bar for workouts routes with `headerShown: false`.
 * Matches stack header typography and chrome; parent should wrap with SafeAreaView (top).
 */
export function WorkoutsNavBar({
  hideTitle = false,
  title = "",
  onBackPress,
  rightSlot,
  rightSlotWidth,
  centerSlot,
  centerSlotLayout = "center",
  surface = "default",
  contentPaddingHorizontal,
  rowMinHeight,
  leftColumnWidth,
  backButtonSize = "default",
  testID,
}: WorkoutsNavBarProps) {
  const rightWidth = rightSlotWidth ?? SIDE_SLOT;
  const leftW = leftColumnWidth ?? SIDE_SLOT;
  const backMargin = contentPaddingHorizontal != null ? 0 : 8;
  return (
    <View
      style={[styles.wrap, surface === "flush" && styles.wrapFlush]}
      accessibilityRole="header"
    >
      <View
        style={[
          styles.row,
          contentPaddingHorizontal != null && { paddingHorizontal: contentPaddingHorizontal },
          rowMinHeight != null && { minHeight: rowMinHeight },
        ]}
      >
        <View style={[styles.left, { width: leftW }]}>
          {testID ? (
            <HeaderBackButton
              onPress={onBackPress}
              size={backButtonSize}
              style={{ marginLeft: backMargin }}
              testID={testID}
            />
          ) : (
            <HeaderBackButton onPress={onBackPress} size={backButtonSize} style={{ marginLeft: backMargin }} />
          )}
        </View>
        {hideTitle ? (
          centerSlot != null ? (
            <View
              style={[
                styles.centerSlotWrap,
                centerSlotLayout === "fill" && styles.centerSlotWrapFill,
                rowMinHeight != null && { minHeight: rowMinHeight },
              ]}
              pointerEvents="box-none"
            >
              {centerSlot}
            </View>
          ) : (
            <View style={styles.titleSpacer} />
          )
        ) : (
          <Text style={[WORKOUTS_STACK_HEADER_TITLE_STYLE, styles.title]} numberOfLines={1}>
            {title}
          </Text>
        )}
        <View style={[styles.right, { width: rightWidth, paddingRight: contentPaddingHorizontal != null ? 0 : 8 }]}>
          {rightSlot ?? <View style={styles.rightSpacer} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: WORKOUTS_HEADER_BAR_BG,
    borderBottomWidth: 0,
  },
  wrapFlush: {
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ROW_MIN,
    paddingBottom: 4,
  },
  left: {
    width: SIDE_SLOT,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  titleSpacer: {
    flex: 1,
  },
  centerSlotWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: ROW_MIN,
    minWidth: 0,
  },
  centerSlotWrapFill: {
    alignItems: "stretch",
    justifyContent: "center",
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rightSpacer: {
    width: 40,
    height: 40,
  },
});
