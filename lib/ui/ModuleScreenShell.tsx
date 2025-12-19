import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";

export type ModuleScreenShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function ModuleScreenShell({ title, subtitle, children }: ModuleScreenShellProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  content: {
    gap: 12,
  },
});
