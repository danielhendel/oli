import React from "react";
import { View, Text, StyleSheet } from "react-native";

import type { InsightDto } from "@oli/contracts";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
type Props = {
  items: InsightDto[];
};

/** Renders pipeline-generated insights tagged for sleep (Oli Intelligence). */
export function SleepInsightsCard({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Insights</Text>
      <View style={styles.list}>
        {items.map((it) => (
          <View key={it.id} style={styles.block}>
            <Text style={styles.insightTitle}>{it.title}</Text>
            <Text style={styles.body}>{it.message}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  list: { gap: 16 },
  block: { gap: 6 },
  insightTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  body: { fontSize: 14, color: "#6E6E73", lineHeight: 20 },
});
