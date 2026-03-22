import React from "react";
import { StyleSheet, View } from "react-native";

/** System strength accent — charts, tabs, links (unchanged). */
export const WORKOUT_STRENGTH_COLOR = "#007AFF";
/** System cardio accent — charts, tabs (unchanged). */
export const CARDIO_RED = "#FF3B30";

/** Softer blue for ring strokes (less heavy than {@link WORKOUT_STRENGTH_COLOR}). */
const RING_STRENGTH_STROKE = "#4A9EF5";
/** Softer red for ring strokes and mixed-day dot (less heavy than {@link CARDIO_RED}). */
const RING_CARDIO_STROKE = "#FF6A62";

const RING_STRENGTH_FILL = "rgba(74, 158, 245, 0.11)";
const RING_CARDIO_FILL = "rgba(255, 106, 98, 0.11)";
/** Mixed days: single blue ring + red dot; use calm blue wash (no split fill). */
const RING_MIXED_FILL = "rgba(74, 158, 245, 0.1)";

const STROKE_WIDTH = 2;
const STROKE_WIDTH_EMPHASIZED = 2.5;

export type WorkoutDayRingProps = {
  size: number;
  hasStrength: boolean;
  hasCardio: boolean;
  /** True when this day is “today” / primary selection — slightly stronger presence. */
  emphasized?: boolean;
  outerTestID?: string;
  /** Mixed-day cardio dot below the date, bottom-center inside the ring (legacy id: was inner ring). */
  innerTestID?: string;
};

export function WorkoutDayRing({
  size,
  hasStrength,
  hasCardio,
  emphasized = false,
  outerTestID,
  innerTestID,
}: WorkoutDayRingProps) {
  if (!hasStrength && !hasCardio) return null;

  const strokeWidth = emphasized ? STROKE_WIDTH_EMPHASIZED : STROKE_WIDTH;
  const outerColor = hasStrength ? RING_STRENGTH_STROKE : RING_CARDIO_STROKE;
  const isMixed = hasStrength && hasCardio;
  /** Small marker; sits under the centered date without touching the ring stroke. */
  const dotSize = Math.max(4, Math.round(size * 0.15));
  /** Gap from host bottom to dot bottom — clears inner edge of border + breathing room. */
  const dotBottom = strokeWidth + Math.max(2, Math.round(size * 0.07));
  const dotLeft = (size - dotSize) / 2;

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
            backgroundColor: isMixed ? RING_MIXED_FILL : hasStrength ? RING_STRENGTH_FILL : RING_CARDIO_FILL,
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
            borderColor: outerColor,
          },
        ]}
      />
      {isMixed ? (
        <View
          testID={innerTestID}
          pointerEvents="none"
          style={[
            styles.cardioDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: dotLeft,
              bottom: dotBottom,
              backgroundColor: RING_CARDIO_STROKE,
            },
          ]}
        />
      ) : null}
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
  cardioDot: {
    position: "absolute",
  },
});
