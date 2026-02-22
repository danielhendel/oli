// lib/ui/WeightInsightCard.tsx — Collapsible trend insights (deterministic bullets).
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export type WeightInsightCardProps = {
  change30dKg: number | null;
  weeklyRateKg: number | null;
  consistency: "low" | "medium" | "high";
  volatilityKg: number | null;
  streakDays: number;
  trendNote: string;
};

function formatDelta(kg: number): string {
  const sign = kg >= 0 ? "+" : "";
  return `${sign}${kg.toFixed(1)} kg`;
}

export function WeightInsightCard({
  change30dKg,
  weeklyRateKg,
  consistency,
  volatilityKg,
  streakDays,
  trendNote,
}: WeightInsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const bullets: string[] = [];
  if (change30dKg != null) bullets.push(`30-day change: ${formatDelta(change30dKg)}`);
  if (weeklyRateKg != null) bullets.push(`Weekly rate: ${formatDelta(weeklyRateKg)}`);
  bullets.push(`Consistency: ${consistency} variability`);

  const expandedBullets: string[] = [];
  if (volatilityKg != null) expandedBullets.push(`Volatility: ${volatilityKg.toFixed(2)} kg`);
  expandedBullets.push(`Streak: ${streakDays} days`);
  expandedBullets.push(trendNote);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? "Collapse trend insights" : "Expand trend insights"}
      >
        <Text style={styles.title}>Trend insights</Text>
        <Text style={styles.chevron}>{expanded ? "▼" : "▶"}</Text>
      </Pressable>
      <View style={styles.body}>
        {bullets.map((b, i) => (
          <Text key={i} style={styles.bullet}>• {b}</Text>
        ))}
        {expanded &&
          expandedBullets.map((b, i) => (
            <Text key={`ex-${i}`} style={[styles.bullet, styles.bulletSecondary]}>• {b}</Text>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700", color: "#1C1C1E" },
  chevron: { fontSize: 12, color: "#6E6E73" },
  body: { gap: 4 },
  bullet: { fontSize: 13, color: "#3C3C43", lineHeight: 20 },
  bulletSecondary: { opacity: 0.85 },
});
