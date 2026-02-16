import React from "react";
import { Platform, View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { OliTheme } from "../theme/tokens";

export type CardVariant = "solid" | "elevated" | "outline";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends Omit<ViewProps, "style"> {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: keyof OliTheme["radii"]; // "sm" | "md" | "lg" | "xl" | "full"
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  accessibleLabel?: string;
}

function paddingValue(theme: OliTheme, p: CardPadding) {
  switch (p) {
    case "none":
      return 0;
    case "sm":
      return theme.spacing.sm;
    case "lg":
      return theme.spacing.lg;
    case "md":
    default:
      return theme.spacing.md;
  }
}

function elevationStyle(theme: OliTheme, level: 0 | 1 | 2): ViewStyle {
  if (level === 0) return {};
  // Light, soft shadow that works in light/dark
  const ios: ViewStyle =
    level === 1
      ? {
          shadowColor: "#000",
          shadowOpacity: theme.scheme === "dark" ? 0.25 : 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }
      : {
          shadowColor: "#000",
          shadowOpacity: theme.scheme === "dark" ? 0.3 : 0.16,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        };

  const android: ViewStyle = { elevation: level === 1 ? 2 : 4 };

  return Platform.select({ ios, android, default: ios }) ?? {};
}

function cardSurface(theme: OliTheme, variant: CardVariant): ViewStyle {
  if (variant === "outline") {
    return {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    };
  }
  if (variant === "elevated") {
    return {
      backgroundColor: theme.colors.card,
      ...elevationStyle(theme, 1),
      borderWidth: 0,
    };
  }
  // solid
  return {
    backgroundColor: theme.colors.card,
    borderWidth: 0,
  };
}

/**
 * Theme-aware card surface with padding + elevation/outline variants.
 * Accessible by default with role="summary" and optional accessibleLabel.
 */
export function Card({
  variant = "elevated",
  padding = "md",
  radius = "lg",
  style,
  children,
  accessibleLabel,
  accessibilityRole,
  ...rest
}: CardProps) {
  const { theme } = useTheme();

  const base: ViewStyle = {
    borderRadius: theme.radii[radius],
    padding: paddingValue(theme, padding),
  };

  const surface = cardSurface(theme, variant);

  return (
    <View
      accessibilityRole={accessibilityRole ?? "summary"}
      accessibilityLabel={accessibleLabel}
      style={[surface, base, style as ViewStyle]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Card;
