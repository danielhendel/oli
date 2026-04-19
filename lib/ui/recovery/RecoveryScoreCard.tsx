import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

type Props = {
  /** Optional heading above the score block (e.g. Sleep detail validation title). */
  title?: string | null;
  score: number | null;
  ratingLabel: string | null;
  fallbackMessage?: string | null;
  /** When score is absent; defaults to Oura-oriented copy for backward compatibility. */
  scoreUnavailableSubtitle?: string | null;
  /** Shown under the numeric score when present (e.g. provenance copy). */
  scoreFootnote?: string | null;
  style?: ViewStyle;
};

export function RecoveryScoreCard({
  title,
  score,
  ratingLabel,
  fallbackMessage,
  scoreUnavailableSubtitle,
  scoreFootnote,
  style,
}: Props) {
  const hasScore = typeof score === "number";
  const noScoreHelp =
    scoreUnavailableSubtitle ??
    "We’ll show a score when Oura provides one.";

  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {fallbackMessage ? <Text style={styles.fallback}>{fallbackMessage}</Text> : null}
      <View style={styles.row}>
        <View style={styles.scoreBlock}>
          {hasScore ? (
            <>
              <Text style={styles.score}>{Math.round(score ?? 0)}</Text>
              {ratingLabel ? <Text style={styles.rating}>{ratingLabel}</Text> : null}
              {scoreFootnote ? <Text style={styles.ratingMuted}>{scoreFootnote}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.scoreUnavailable}>Score unavailable</Text>
              <Text style={styles.ratingMuted}>{noScoreHelp}</Text>
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
    borderRadius: 18,
    padding: 18,
    gap: 14,
    ...elevatedCardSurfaceStyle,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.35,
    marginBottom: 0,
  },
  fallback: {
    fontSize: 13,
    color: "#8E8E93",
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
    fontSize: 52,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -1.2,
    lineHeight: 56,
  },
  rating: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "500",
    color: "#636366",
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

