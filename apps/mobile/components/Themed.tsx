// apps/mobile/components/Themed.tsx
import React from 'react';
import { Text, View, type TextProps, type ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export function ThemedView({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: 'transparent', borderColor: colors.border }, style]} {...props} />;
}

export function ThemedText({
  style,
  type = 'body',
  ...props
}: TextProps & { type?: 'title' | 'body' | 'mono' }) {
  const { colors, typography } = useTheme();
  const fontSize = type === 'title' ? typography.title : type === 'mono' ? typography.mono : typography.body;
  const fontFamily = type === 'mono' ? 'Menlo' : undefined;
  return <Text style={[styles.base, { color: colors.text, fontSize, fontFamily }, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: { lineHeight: 22 }
});
