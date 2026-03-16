import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";

type Props = {
  score: number | null;
  ratingLabel: string | null;
  fallbackMessage?: string | null;
  style?: ViewStyle;
};

export function RecoveryScoreCard({ score, ratingLabel, fallbackMessage, style }: Props) {
  const hasScore = typeof score === "number";

  return (
    <View style={[styles.card, style]}>
      {fallbackMessage ? <Text style={styles.fallback}>{fallbackMessage}</Text> : null}
      <View style={styles.row}>
        <View style={styles.scoreBlock}>
          {hasScore ? (
            <>
              <Text style={styles.score}>{Math.round(score ?? 0)}</Text>
              {ratingLabel ? <Text style={styles.rating}>{ratingLabel}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.scoreUnavailable}>Score unavailable</Text>
              <Text style={styles.ratingMuted}>We’ll show a score when Oura provides one.</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  fallback: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreBlock: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  score: {
    fontSize: 56,
    fontWeight: "800",
    color: "#1C1C1E",
  },
  rating: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: "#6E6E73",
  },
  scoreUnavailable: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  ratingMuted: {
    marginTop: 4,
    fontSize: 14,
    color: "#8E8E93",
  },
});

