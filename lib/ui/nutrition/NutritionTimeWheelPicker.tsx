import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  TIME_WHEEL_HOURS,
  TIME_WHEEL_MERIDIEM,
  TIME_WHEEL_MINUTES,
  type TimeWheelSelection,
} from "@/lib/nutrition/editNutritionLog";
import {
  NUTRITION_WHEEL_ITEM_HEIGHT,
  NUTRITION_WHEEL_PADDING,
  NUTRITION_WHEEL_VISIBLE_HEIGHT,
  NutritionWheelColumn,
} from "@/lib/ui/nutrition/NutritionWheelColumn";
import { UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

type Props = {
  value: TimeWheelSelection;
  onChange: (next: TimeWheelSelection) => void;
  testID?: string;
};

function padMinute(m: number): string {
  return String(m).padStart(2, "0");
}

const COLUMN_HEADERS = ["Hour", "Minute", "AM/PM"] as const;

/** Three-column hour / minute / AM·PM wheel for nutrition log time editing. */
export function NutritionTimeWheelPicker({ value, onChange, testID = "nutrition-time-wheel" }: Props) {
  return (
    <View style={styles.root} testID={testID} accessibilityLabel="Time picker">
      <View style={styles.headerRow}>
        {COLUMN_HEADERS.map((title) => (
          <Text key={title} style={styles.headerText} accessibilityRole="header">
            {title}
          </Text>
        ))}
      </View>

      <View style={styles.wheelsWrap}>
        <View style={styles.sharedSelectionBand} pointerEvents="none" />
        <NutritionWheelColumn
          data={TIME_WHEEL_HOURS}
          value={value.hour12}
          onValueChange={(hour12) => onChange({ ...value, hour12 })}
          getDisplayLabel={(h) => String(h)}
          getAccessibilityLabel={(h) => `Hour ${h}`}
          testID={`${testID}-hour`}
        />
        <NutritionWheelColumn
          data={TIME_WHEEL_MINUTES}
          value={value.minute}
          onValueChange={(minute) => onChange({ ...value, minute })}
          getDisplayLabel={padMinute}
          getAccessibilityLabel={(m) => `Minute ${padMinute(m)}`}
          testID={`${testID}-minute`}
        />
        <NutritionWheelColumn
          data={TIME_WHEEL_MERIDIEM}
          value={value.meridiem}
          onValueChange={(meridiem) => onChange({ ...value, meridiem })}
          getDisplayLabel={(m) => m}
          getAccessibilityLabel={(m) => `Period ${m}`}
          testID={`${testID}-meridiem`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  headerText: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
    letterSpacing: 0.2,
  },
  wheelsWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: NUTRITION_WHEEL_VISIBLE_HEIGHT,
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  sharedSelectionBand: {
    position: "absolute",
    left: 8,
    right: 8,
    top: NUTRITION_WHEEL_PADDING,
    height: NUTRITION_WHEEL_ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10, 132, 255, 0.24)",
    zIndex: 1,
  },
});
