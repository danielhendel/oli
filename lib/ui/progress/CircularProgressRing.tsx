import React from "react";
import { type StyleProp, StyleSheet, Text, View, type TextStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  /** Percent value in [0,100]; null renders an empty ring. */
  percent: number | null;
  size?: number;
  strokeWidth?: number;
  /** Optional override for center score typography (defaults to {@link styles.label}). */
  labelStyle?: StyleProp<TextStyle>;
  trackColor: string;
  progressColor: string;
  label: string;
  accessibilityLabel: string;
  testID?: string;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function CircularProgressRing({
  percent,
  size = 136,
  strokeWidth = 7,
  labelStyle,
  trackColor,
  progressColor,
  label,
  accessibilityLabel,
  testID,
}: Props): React.ReactElement {
  const clamped = percent == null ? 0 : clampPercent(percent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View
      style={[styles.host, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={percent == null ? { min: 0, max: 100 } : { now: clamped, min: 0, max: 100 }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Svg
        width={size}
        height={size}
        style={styles.svg}
        {...(testID ? { testID: `${testID}-svg` } : {})}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
          {...(testID ? { testID: `${testID}-progress` } : {})}
        />
      </Svg>
      <Text
        style={[styles.label, labelStyle]}
        {...(testID ? { testID: `${testID}-label` } : {})}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  /** Matches legacy WeeklyFitnessCard `combinedPercent` (large score before ring). */
  label: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    paddingHorizontal: 6,
    includeFontPadding: false,
  },
});
