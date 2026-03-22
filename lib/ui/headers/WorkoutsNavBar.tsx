import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_STACK_HEADER_TITLE_STYLE,
  WORKOUTS_HEADER_BAR_BG,
} from "@/lib/ui/headers/workoutsStackHeader";

const SIDE_SLOT = 56;
const ROW_MIN = 44;

export type WorkoutsNavBarProps = {
  /** Omit center title (balanced bar: back + empty center + right spacer). */
  hideTitle?: boolean;
  title?: string;
  onBackPress: () => void;
  rightSlot?: React.ReactNode;
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
  testID,
}: WorkoutsNavBarProps) {
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.row}>
        <View style={styles.left}>
          {testID ? (
            <HeaderBackButton onPress={onBackPress} style={{ marginLeft: 8 }} testID={testID} />
          ) : (
            <HeaderBackButton onPress={onBackPress} style={{ marginLeft: 8 }} />
          )}
        </View>
        {hideTitle ? (
          <View style={styles.titleSpacer} />
        ) : (
          <Text style={[WORKOUTS_STACK_HEADER_TITLE_STYLE, styles.title]} numberOfLines={1}>
            {title}
          </Text>
        )}
        <View style={styles.right}>{rightSlot ?? <View style={styles.rightSpacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: WORKOUTS_HEADER_BAR_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
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
  right: {
    width: SIDE_SLOT,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  rightSpacer: {
    width: 40,
    height: 40,
  },
});
