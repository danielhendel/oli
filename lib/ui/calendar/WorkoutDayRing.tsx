import React from "react";
import { StyleSheet, View } from "react-native";
import {
  SYSTEM_ACCENT,
  SYSTEM_ACCENT_FILL_11,
  SYSTEM_ACCENT_MIXED_MARK,
  SYSTEM_ACCENT_OVERLAY_10,
} from "@/lib/ui/theme/systemAccent";

/**
 * @deprecated Use {@link SYSTEM_ACCENT} from `@/lib/ui/theme/systemAccent`. Kept for call-site imports.
 */
export const WORKOUT_STRENGTH_COLOR = SYSTEM_ACCENT;
/**
 * @deprecated Use {@link SYSTEM_ACCENT}. Calendar rings no longer use a separate cardio red.
 */
export const CARDIO_RED = SYSTEM_ACCENT;

/**
 * @deprecated Ring fill is {@link SYSTEM_ACCENT_FILL_11}; name retained for analytics theme comments.
 */
export const STRENGTH_ACCENT_LIGHT = SYSTEM_ACCENT_FILL_11;

const RING_STROKE = SYSTEM_ACCENT;
const RING_FILL = SYSTEM_ACCENT_FILL_11;
const RING_MIXED_FILL = SYSTEM_ACCENT_OVERLAY_10;

/** Default ring: slightly finer so selected (emphasized) reads clearly. */
const STROKE_WIDTH = 1.75;
const STROKE_WIDTH_EMPHASIZED = 2.75;

export type WorkoutDayRingProps = {
  size: number;
  hasStrength: boolean;
  hasCardio: boolean;
  /** True when this day is “today” / primary selection — slightly stronger presence. */
  emphasized?: boolean;
  outerTestID?: string;
  /** Mixed-day marker below the date, bottom-center inside the ring. */
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
            backgroundColor: isMixed ? RING_MIXED_FILL : RING_FILL,
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
            borderColor: RING_STROKE,
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
              backgroundColor: SYSTEM_ACCENT_MIXED_MARK,
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
