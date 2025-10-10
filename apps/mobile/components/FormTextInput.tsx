// apps/mobile/components/FormTextInput.tsx
import React, { forwardRef } from 'react';
import { TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { ThemedText } from './Themed';
import { useTheme } from '@/theme';

// Disallow passing accessibilityRole to TextInput (RN doesn't support "textbox")
type Props = Omit<TextInputProps, 'accessibilityRole'> & { label: string };

export const FormTextInput = forwardRef<TextInput, Props>(function FormTextInput(
  { label, style, placeholderTextColor, autoCapitalize, ...props },
  ref
) {
  const { colors } = useTheme();

  return (
    <View accessibilityLabel={label} accessible style={styles.wrap}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        ref={ref}
        style={[
          styles.input,
          { borderColor: colors.border, color: colors.text },
          style
        ]}
        placeholderTextColor={placeholderTextColor ?? '#888'}
        // Sensible defaults for auth forms; can be overridden by callers
        autoCapitalize={autoCapitalize ?? 'none'}
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  label: { marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16
  }
});
