import React from "react";
import { StyleSheet, View } from "react-native";

export const STRENGTH_GREEN = "#32D74B";
export const CARDIO_RED = "#FF3B30";

export type WorkoutDayRingProps = {
  size: number;
  hasStrength: boolean;
  hasCardio: boolean;
  outerTestID?: string;
  innerTestID?: string;
};

export function WorkoutDayRing({
  size,
  hasStrength,
  hasCardio,
  outerTestID,
  innerTestID,
}: WorkoutDayRingProps) {
  if (!hasStrength && !hasCardio) return null;

  const outerColor = hasStrength ? STRENGTH_GREEN : CARDIO_RED;
  const strokeWidth = 3;
  const inset = Math.max(3, Math.round(size * 0.1));
  const innerSize = Math.max(0, size - inset * 2);

  return (
    <>
      <View
        testID={outerTestID}
        pointerEvents="none"
        style={[
          styles.outerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: outerColor,
          },
        ]}
      />
      {hasStrength && hasCardio ? (
        <View
          testID={innerTestID}
          pointerEvents="none"
          style={[
            styles.innerRing,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              borderWidth: strokeWidth,
              borderColor: CARDIO_RED,
            },
          ]}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  innerRing: {
    position: "absolute",
  },
});
