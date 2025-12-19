import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type ModuleEmptyStateProps = {
  title: string;
  description: string;
  hint?: string;
};

export function ModuleEmptyState({ title, description, hint }: ModuleEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  description: {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 18,
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
    lineHeight: 18,
  },
});
