import React, { forwardRef, useMemo, useState } from "react";
import {
  View,
  TextInput,
  type TextInputProps,
  StyleSheet,
  Switch as RNSwitch,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";

type InputProps = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  label?: string;
  description?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, description, error, containerStyle, leftAccessory, rightAccessory, editable = true, ...rest },
  ref
) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = useMemo(() => {
    if (!editable) return theme.colors.border;
    if (error) return theme.colors.primary; // temporary attention color
    return focused ? theme.colors.primary : theme.colors.border;
  }, [editable, error, focused, theme.colors]);

  // Use theme text color for placeholder (no 'muted' token on ThemeColors)
  const placeholderTextColor = theme.colors.text;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text weight="medium" style={{ marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            borderColor,
            // no explicit background token; keep native background
            borderRadius: theme.radii.lg,
          },
        ]}
      >
        {leftAccessory ? <View style={{ marginRight: 8 }}>{leftAccessory}</View> : null}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              paddingVertical: 12,
              paddingHorizontal: 12,
            },
          ]}
          editable={editable}
          placeholderTextColor={placeholderTextColor}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightAccessory ? <View style={{ marginLeft: 8 }}>{rightAccessory}</View> : null}
      </View>

      {description && !error ? (
        <Text tone="muted" style={{ marginTop: 6 }}>
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text style={{ marginTop: 6 }} weight="medium">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

type SwitchRowProps = {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  description?: string;
  disabled?: boolean;
};

export function SwitchRow({ label, value, onValueChange, description, disabled }: SwitchRowProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.switchRow,
        {
          // no explicit background token; keep native background
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={{ flex: 1 }}>
        <Text weight="medium">{label}</Text>
        {description ? (
          <Text tone="muted" style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <RNSwitch
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={undefined}
        ios_backgroundColor={theme.colors.border}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  field: {
    minHeight: 44,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: { flex: 1, fontSize: 16 },
  switchRow: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
});
