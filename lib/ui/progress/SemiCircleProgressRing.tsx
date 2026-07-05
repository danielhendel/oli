import React from "react";
import { type StyleProp, StyleSheet, Text, View, type TextStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  /** Percent value in [0,100]; null renders an empty arc. */
  percent: number | null;
  size?: number;
  strokeWidth?: number;
  labelStyle?: StyleProp<TextStyle>;
  sublabel?: string;
  sublabelStyle?: StyleProp<TextStyle>;
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

/**
 * Top semi-circle progress gauge — arc spans 180° (left to right over the top).
 * Bottom half of the circle is clipped for a calm, native gauge feel.
 */
export function SemiCircleProgressRing({
  percent,
  size = 220,
  strokeWidth = 10,
  labelStyle,
  sublabel,
  sublabelStyle,
  trackColor,
  progressColor,
  label,
  accessibilityLabel,
  testID,
}: Props): React.ReactElement {
  const clamped = percent == null ? 0 : clampPercent(percent);
  const radius = (size - strokeWidth) / 2;
  const halfCircumference = Math.PI * radius;
  const dashOffset = halfCircumference * (1 - clamped / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View
      style={[styles.host, { width: size, height: size / 2 + strokeWidth }]}
      accessibilityRole="progressbar"
      accessibilityValue={percent == null ? { min: 0, max: 100 } : { now: clamped, min: 0, max: 100 }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <View style={[styles.clip, { width: size, height: size / 2 + strokeWidth / 2 }]}>
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${halfCircumference} ${halfCircumference}`}
            strokeDashoffset={0}
            rotation={180}
            originX={cx}
            originY={cy}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${halfCircumference} ${halfCircumference}`}
            strokeDashoffset={dashOffset}
            rotation={180}
            originX={cx}
            originY={cy}
            {...(testID ? { testID: `${testID}-progress` } : {})}
          />
        </Svg>
      </View>
      <View style={styles.labelBlock}>
        <Text style={[styles.label, labelStyle]} {...(testID ? { testID: `${testID}-label` } : {})}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[styles.sublabel, sublabelStyle]} maxFontSizeMultiplier={1.25}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    justifyContent: "flex-end",
    alignSelf: "center",
    position: "relative",
  },
  clip: {
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  labelBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    gap: 2,
  },
  label: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    includeFontPadding: false,
  },
  sublabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    color: UI_TEXT_PRIMARY,
    opacity: 0.72,
    textAlign: "center",
  },
});
