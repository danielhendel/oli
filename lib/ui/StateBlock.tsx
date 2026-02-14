// lib/ui/StateBlock.tsx
// Phase 1.5 Sprint 6 — Unified explicit states (loading/missing/error/offline).
// Structural clarity only; no behavioral change. Used by Dash for consistent state UI.

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type OfflineStateProps = {
  /** Short title (e.g. "Offline") */
  title: string;
  /** Message explaining when content will appear (e.g. "Health Score will load when connection is restored.") */
  message: string;
};

/**
 * Explicit offline state block. Use when status === "error" and reason === "network".
 * No color-only meaning: title and message convey state; not decorative.
 */
export function OfflineState({ title, message }: OfflineStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  message: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
  },
});
