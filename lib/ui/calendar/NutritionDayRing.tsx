import React from "react";
import { StyleSheet, View } from "react-native";
import { NUTRITION_ACCENT, NUTRITION_ACCENT_LIGHT } from "@/lib/ui/nutrition/nutritionOverviewTheme";
const STROKE_WIDTH = 2;
const STROKE_WIDTH_EMPHASIZED = 2.5;

export type NutritionDayRingProps = {
  size: number;
  hasNutrition: boolean;
  emphasized?: boolean;
  outerTestID?: string;
};

/**
 * Single-domain ring for days with a nutrition log (canonical nutrition events), Strength weekly-strip layout parity.
 */
export function NutritionDayRing({ size, hasNutrition, emphasized = false, outerTestID }: NutritionDayRingProps) {
  if (!hasNutrition) return null;
  const strokeWidth = emphasized ? STROKE_WIDTH_EMPHASIZED : STROKE_WIDTH;
  return (
    <View style={[styles.host, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.fillDisk,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: NUTRITION_ACCENT_LIGHT,
          },
        ]}
      />
      <View
        testID={outerTestID}
        pointerEvents="none"
        style={[
          styles.ringLayer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: NUTRITION_ACCENT,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  fillDisk: {
    ...StyleSheet.absoluteFillObject,
  },
  ringLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
