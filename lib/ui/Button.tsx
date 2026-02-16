import React, { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type ViewStyle,
  View,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import type { OliTheme } from "../theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "onPress" | "style"> {
  label?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/** Exported for unit tests */
export function getButtonStyles(theme: OliTheme, variant: ButtonVariant, disabled = false) {
  const c = theme.colors;

  if (variant === "ghost") {
    return {
      backgroundColor: "transparent",
      borderColor: c.border,
      borderWidth: 1,
      textColor: disabled ? c.textMuted : c.text,
      spinnerColor: disabled ? c.textMuted : c.text,
    };
  }

  if (variant === "secondary") {
    return {
      backgroundColor: disabled ? theme.colors.border : theme.colors.secondary,
      borderColor: "transparent",
      borderWidth: 0,
      textColor: theme.colors.onSecondary,
      spinnerColor: theme.colors.onSecondary,
    };
  }

  // primary (default)
  return {
    backgroundColor: disabled ? theme.colors.border : theme.colors.primary,
    borderColor: "transparent",
    borderWidth: 0,
    textColor: theme.colors.onPrimary,
    spinnerColor: theme.colors.onPrimary,
  };
}

function sizePadding(theme: OliTheme, size: ButtonSize): { pv: number; ph: number; radius: number; textSize: number } {
  // Removed unused `spacing`
  const { radii, typography } = theme;
  switch (size) {
    case "sm":
      return { pv: 8, ph: 12, radius: radii.sm, textSize: typography.size.sm };
    case "lg":
      return { pv: 14, ph: 18, radius: radii.lg, textSize: typography.size.md };
    case "md":
    default:
      return { pv: 12, ph: 16, radius: radii.md, textSize: typography.size.md };
  }
}

/**
 * Theme-aware Button with variants, sizes, loading/disabled states, large hit area,
 * and accessibility defaults. Use `label` for quick text or `children` for custom.
 */
export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    children,
    onPress,
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    disabled = false,
    style,
    leftIcon,
    rightIcon,
    accessibilityRole,
    ...rest
  },
  ref
) {
  const { theme } = useTheme();
  const { pv, ph, radius, textSize } = sizePadding(theme, size);
  const palette = getButtonStyles(theme, variant, disabled || loading);

  const baseStyle: ViewStyle = {
    paddingVertical: pv,
    paddingHorizontal: ph,
    borderRadius: radius,
    backgroundColor: palette.backgroundColor,
    borderColor: palette.borderColor,
    borderWidth: palette.borderWidth,
    opacity: disabled || loading ? 0.7 : 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...(fullWidth ? { alignSelf: "stretch" } : {}),
  };

  return (
    <Pressable
      ref={ref}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={!disabled && !loading ? onPress : undefined}
      style={({ pressed }) => [
        baseStyle,
        variant !== "ghost" && { transform: [{ scale: pressed ? 0.98 : 1 }] },
        style as ViewStyle,
      ]}
      {...rest}
    >
      {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
      {loading ? (
        <ActivityIndicator size="small" color={palette.spinnerColor} />
      ) : children ? (
        children
      ) : (
        <Text
          weight="medium"
          style={{ color: palette.textColor, fontSize: textSize }}
          truncate
        >
          {label}
        </Text>
      )}
      {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
    </Pressable>
  );
});

export default Button;
