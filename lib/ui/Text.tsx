import React, { forwardRef } from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { type TypographyTokens } from "../theme/tokens";

type SizeKey = keyof TypographyTokens["size"]; // "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
type WeightKey = keyof TypographyTokens["weight"]; // "regular" | "medium" | "bold"
type LeadingKey = keyof TypographyTokens["lineHeight"]; // "tight" | "snug" | "normal" | "relaxed"

type Tone =
  | "default"
  | "muted"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

/** Public props kept minimal and typed-first */
export interface TextProps extends Omit<RNTextProps, "style"> {
  size?: SizeKey;
  weight?: WeightKey;
  leading?: LeadingKey;
  tone?: Tone;
  align?: TextStyle["textAlign"];
  /** Truncate to a single line */
  truncate?: boolean;
  /** Optional style override (merged last) */
  style?: TextStyle | TextStyle[];
}

/** Resolve fontSize + lineHeight based on tokens */
function resolveType({
  size,
  leading,
  t,
}: {
  size: SizeKey;
  leading: LeadingKey;
  t: TypographyTokens;
}) {
  const fontSize = t.size[size];
  const lineHeight = Math.round(fontSize * t.lineHeight[leading] * 1.0);
  return { fontSize, lineHeight };
}

/** Map tone to theme color */
function toneColor(tone: Tone, c: ReturnType<typeof useTheme>["theme"]["colors"]) {
  switch (tone) {
    case "muted":
      return c.textMuted;
    case "primary":
      return c.primary;
    case "secondary":
      return c.secondary;
    case "success":
      return c.success;
    case "warning":
      return c.warning;
    case "danger":
      return c.danger;
    default:
      return c.text;
  }
}

/**
 * Theme-aware Text primitive with sensible accessibility defaults.
 * - allowFontScaling: true (respects system settings)
 * - tone/sizes/weight from tokens
 * - truncate => numberOfLines=1
 */
export const Text = forwardRef<RNText, TextProps>(function Text(
  {
    size = "md",
    weight = "regular",
    leading = "normal",
    tone = "default",
    align = "auto",
    truncate = false,
    allowFontScaling = true,
    style,
    accessibilityRole,
    ...rest
  },
  ref
) {
  const { theme } = useTheme();

  const { fontSize, lineHeight } = resolveType({
    size,
    leading,
    t: theme.typography,
  });

  const baseStyle: TextStyle = {
    color: toneColor(tone, theme.colors),
    fontSize,
    lineHeight,
    textAlign: align,
    // Use platform default family; can be swapped later via tokens
    fontFamily: theme.typography.fontFamily.regular,
    fontWeight: theme.typography.weight[weight],
  };

  return (
    <RNText
      ref={ref}
      // Accessibility: default to role="text" if none provided
      accessibilityRole={accessibilityRole ?? "text"}
      allowFontScaling={allowFontScaling}
      numberOfLines={truncate ? 1 : rest.numberOfLines}
      style={[baseStyle, style as TextStyle]}
      {...rest}
    />
  );
});

export default Text;
